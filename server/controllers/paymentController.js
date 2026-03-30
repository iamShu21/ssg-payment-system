const pool = require("../db");
const axios = require("axios");

const createCheckoutSession = async (req, res) => {
  try {
    console.log("[DEBUG] createCheckoutSession called");
    console.log("[DEBUG] req.body:", req.body);

    const { student_fee_id } = req.body;

    if (!student_fee_id) {
      return res.status(400).json({ message: "student_fee_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        sf.student_fee_id,
        sf.assignment_status,
        s.student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        s.email,
        f.fee_id,
        f.fee_name,
        f.description,
        f.amount
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE sf.student_fee_id = ?
      `,
      [student_fee_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student fee not found" });
    }

    const studentFee = rows[0];
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (studentFee.assignment_status === "paid") {
      return res.status(400).json({ message: "This fee is already paid" });
    }

    const amountInCentavos = Math.round(Number(studentFee.amount) * 100);

    const payload = {
      data: {
        attributes: {
          billing: {
            name: `${studentFee.first_name} ${studentFee.last_name}`,
            email: studentFee.email || "student@example.com",
          },
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              currency: "PHP",
              amount: amountInCentavos,
              name: studentFee.fee_name,
              quantity: 1,
              description: studentFee.description || studentFee.fee_name,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card"],
          success_url: `${frontendUrl}/payment-success`,
          cancel_url: `${frontendUrl}/payment-cancel`,
          metadata: {
            student_fee_id: studentFee.student_fee_id,
            student_id: studentFee.student_id,
            student_number: studentFee.student_number,
            fee_id: studentFee.fee_id,
            fee_name: studentFee.fee_name,
          },
        },
      },
    };

    const auth = Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64");

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      payload,
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Basic ${auth}`,
        },
      }
    );

    const checkout = response.data.data;
    const checkoutId = checkout.id;
    const checkoutUrl = checkout.attributes.checkout_url;

    const [paymentResult] = await pool.query(
      `
      INSERT INTO payments
      (student_fee_id, paymongo_checkout_id, amount, payment_status)
      VALUES (?, ?, ?, 'pending')
      `,
      [student_fee_id, checkoutId, studentFee.amount]
    );

    await pool.query(
      `
      UPDATE student_fees
      SET assignment_status = 'pending'
      WHERE student_fee_id = ?
      `,
      [student_fee_id]
    );

    res.status(201).json({
      message: "Checkout session created successfully",
      payment_id: paymentResult.insertId,
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
    });
  } catch (error) {
    console.error(
      "Create checkout session error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to create checkout session",
      error: error.response?.data || error.message,
    });
  }
};

const handleWebhook = async (req, res) => {
  try {
    console.log("==== WEBHOOK RECEIVED ====");
    console.log("Full payload:", JSON.stringify(req.body, null, 2));

    const eventType = req.body?.data?.attributes?.type;
    const resource = req.body?.data?.attributes?.data;

    // Metadata location can vary in PayMongo webhook payloads.
    const resourceAttributes = resource?.attributes || {};
    const checkoutMetadata = resourceAttributes.metadata || {};
    const paymentMetadata =
      resourceAttributes.payments?.[0]?.attributes?.metadata || {};
    const paymentIntentMetadata =
      resourceAttributes.payment_intent?.attributes?.metadata || {};
    const metadata =
      checkoutMetadata.student_fee_id != null
        ? checkoutMetadata
        : paymentMetadata.student_fee_id != null
          ? paymentMetadata
          : paymentIntentMetadata;
    const checkoutId =
      resource?.id ||
      resourceAttributes.checkout_session_id ||
      resourceAttributes.checkout_id ||
      null;
    const studentFeeIdRaw = metadata.student_fee_id;
    const studentFeeId = studentFeeIdRaw ? Number(studentFeeIdRaw) : null;

    console.log("eventType:", eventType);
    console.log("checkoutId:", checkoutId);
    console.log("checkoutMetadata:", checkoutMetadata);
    console.log("paymentMetadata:", paymentMetadata);
    console.log("paymentIntentMetadata:", paymentIntentMetadata);
    console.log("studentFeeIdRaw:", studentFeeIdRaw, "type:", typeof studentFeeIdRaw);
    console.log("studentFeeId parsed:", studentFeeId, "isNaN:", Number.isNaN(studentFeeId));

    await pool.query(
      `INSERT INTO webhook_logs (event_type, reference_id, payload)
       VALUES (?, ?, ?)`,
      [eventType || null, checkoutId || null, JSON.stringify(req.body)]
    );

    if (eventType !== "checkout_session.payment.paid") {
      console.log("Skipping event type:", eventType);
      return res.status(200).json({ received: true });
    }

    if (!checkoutId || !studentFeeId || Number.isNaN(studentFeeId)) {
      console.log("Cannot continue: missing/invalid checkoutId or studentFeeId");
      return res.status(200).json({ received: true });
    }

    const [matchingPayments] = await pool.query(
      `SELECT payment_id, student_fee_id, paymongo_checkout_id, payment_status
       FROM payments
       WHERE student_fee_id = ?
         AND paymongo_checkout_id = ?
       ORDER BY payment_id DESC`,
      [studentFeeId, checkoutId]
    );

    console.log("matchingPayments length:", matchingPayments.length);
    console.log("matchingPayments rows:", matchingPayments);

    if (matchingPayments.length === 0) {
      console.log("No payment row matched student_fee_id + checkout_id");
      return res.status(200).json({ received: true });
    }

    // Use matched payment_id to avoid silent no-op updates from mismatched filters.
    const matchedPayment = matchingPayments[0];

    const [paymentUpdateResult] = await pool.query(
      `UPDATE payments
       SET payment_status = 'paid',
           paymongo_reference = ?,
           paid_at = NOW()
       WHERE payment_id = ?`,
      [checkoutId, matchedPayment.payment_id]
    );

    console.log("payments UPDATE affectedRows:", paymentUpdateResult.affectedRows);

    const [studentFeeUpdateResult] = await pool.query(
      `UPDATE student_fees
       SET assignment_status = 'paid'
       WHERE student_fee_id = ?`,
      [matchedPayment.student_fee_id]
    );

    // Additive notifications only; must not interrupt webhook payment updates.
    try {
      const [paymentInfoRows] = await pool.query(
        `
        SELECT
          p.payment_id,
          p.amount,
          p.paymongo_reference,
          p.receipt_number,
          p.payment_method,
          s.user_id AS student_user_id,
          s.student_number,
          CONCAT(s.first_name, ' ', s.last_name) AS student_name,
          f.fee_name
        FROM payments p
        JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
        JOIN students s ON sf.student_id = s.student_id
        JOIN fees f ON sf.fee_id = f.fee_id
        WHERE p.payment_id = ?
        LIMIT 1
        `,
        [matchedPayment.payment_id]
      );

      if (paymentInfoRows.length > 0) {
        const info = paymentInfoRows[0];
        const amountText = `PHP ${Number(info.amount || 0).toLocaleString()}`;
        const reference = info.paymongo_reference || checkoutId;

        if (info.student_user_id) {
          await pool.query(
            `
            INSERT INTO notifications (user_id, title, message, is_read)
            VALUES (?, 'Payment Successful', ?, 0)
            `,
            [
              info.student_user_id,
              `Your payment for "${info.fee_name}" was successful (${amountText}). Reference: ${reference}.`,
            ]
          );
        }

        const [staffUsers] = await pool.query(
          `
          SELECT user_id, role
          FROM users
          WHERE role IN ('ssg_officer', 'admin') AND status = 'active'
          `
        );

        for (const staff of staffUsers) {
          await pool.query(
            `
            INSERT INTO notifications (user_id, title, message, is_read)
            VALUES (?, 'New Paid Transaction', ?, 0)
            `,
            [
              staff.user_id,
              `Payment received from ${info.student_name} (${info.student_number}) for "${info.fee_name}" amounting to ${amountText}.`,
            ]
          );
        }
      }
    } catch (notificationError) {
      console.error("Webhook notification insert error:", notificationError);
    }

    console.log("student_fees UPDATE affectedRows:", studentFeeUpdateResult.affectedRows);
    console.log("Webhook paid flow completed");

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ received: true });
  }
};

const getPaymentHistoryByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    const [studentRows] = await pool.query(
      `SELECT student_id FROM students WHERE student_id = ?`,
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.payment_id,
        p.payment_status,
        p.amount,
        p.paid_at,
        p.created_at,
        p.paymongo_checkout_id,
        p.paymongo_reference,
        p.receipt_number,
        f.fee_name,
        f.description,
        f.due_date,
        sf.assignment_status
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE sf.student_id = ?
      ORDER BY p.payment_id DESC
      `,
      [student_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOfficerPaymentSummary = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS total_paid_transactions,
        SUM(CASE WHEN payment_status = 'paid' AND (officer_status IS NULL OR officer_status = '' OR officer_status = 'unreviewed') THEN 1 ELSE 0 END) AS unreviewed_payments,
        SUM(CASE WHEN officer_status = 'verified' THEN 1 ELSE 0 END) AS verified_payments,
        SUM(CASE WHEN officer_status = 'processed' THEN 1 ELSE 0 END) AS processed_payments
      FROM payments
      `
    );

    const [recentRows] = await pool.query(
      `
      SELECT
        p.payment_id,
        p.payment_status,
        p.officer_status,
        p.amount,
        p.paid_at,
        p.created_at,
        s.student_number,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        f.fee_name
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      ORDER BY p.payment_id DESC
      LIMIT 10
      `
    );

    res.json({
      summary: rows[0],
      recent_activity: recentRows,
    });
  } catch (error) {
    console.error("Get officer payment summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOfficerPayments = async (req, res) => {
  try {
    const { payment_status, officer_status, search } = req.query;

    let sql = `
      SELECT
        p.payment_id,
        p.student_fee_id,
        p.amount,
        p.payment_status,
        p.officer_status,
        p.payment_method,
        p.paymongo_reference,
        p.receipt_number,
        p.paid_at,
        p.created_at,
        s.student_id,
        s.student_number,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        f.fee_name,
        f.description,
        sf.assignment_status
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE 1 = 1
    `;

    const params = [];

    if (payment_status) {
      sql += " AND p.payment_status = ?";
      params.push(payment_status);
    }

    if (officer_status) {
      if (officer_status === "unreviewed") {
        sql += " AND (p.officer_status IS NULL OR p.officer_status = '' OR p.officer_status = 'unreviewed')";
      } else {
        sql += " AND p.officer_status = ?";
        params.push(officer_status);
      }
    }

    if (search) {
      sql += `
        AND (
          s.student_number LIKE ?
          OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY p.payment_id DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error("Get officer payments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateOfficerPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { officer_status, remarks, processed_by } = req.body;

    if (!officer_status) {
      return res.status(400).json({ message: "officer_status is required" });
    }

    if (!["verified", "processed"].includes(officer_status)) {
      return res
        .status(400)
        .json({ message: "officer_status must be 'verified' or 'processed'" });
    }

    const [paymentRows] = await pool.query(
      `SELECT payment_id, payment_status FROM payments WHERE payment_id = ?`,
      [payment_id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (paymentRows[0].payment_status !== "paid") {
      return res
        .status(400)
        .json({ message: "Only paid payments can be verified/processed" });
    }

    const [updateResult] = await pool.query(
      `
      UPDATE payments
      SET officer_status = ?
      WHERE payment_id = ?
      `,
      [officer_status, payment_id]
    );

    await pool.query(
      `
      INSERT INTO payment_processing (payment_id, processed_by, processing_status, remarks, processed_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [payment_id, processed_by || null, officer_status, remarks || null]
    );

    res.json({
      message: "Officer payment status updated",
      affectedRows: updateResult.affectedRows,
    });
  } catch (error) {
    console.error("Update officer payment status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getReceiptByPaymentId = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        p.payment_id,
        p.amount,
        p.payment_status,
        p.payment_method,
        p.paymongo_reference,
        p.receipt_number,
        p.paid_at,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        f.fee_name
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE p.payment_id = ?
      `,
      [payment_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get receipt by payment id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOfficerTransactionHistory = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        pp.processing_id,
        pp.payment_id,
        pp.processed_by,
        pp.processing_status,
        pp.remarks,
        pp.processed_at,
        p.amount,
        p.payment_status,
        p.officer_status,
        p.paymongo_reference,
        p.receipt_number,
        s.student_number,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        f.fee_name
      FROM payment_processing pp
      JOIN payments p ON pp.payment_id = p.payment_id
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE pp.processing_status IN ('verified', 'processed')
      ORDER BY pp.processing_id DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Get officer transaction history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getPaymentHistoryByStudentId,
  getOfficerPaymentSummary,
  getOfficerPayments,
  updateOfficerPaymentStatus,
  getReceiptByPaymentId,
  getOfficerTransactionHistory,
};