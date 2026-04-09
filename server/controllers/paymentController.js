const pool = require("../db");
const axios = require("axios");

/**
 * Single mapping for officer review PATCH body.
 * Canonical actions: "approved" | "rejected" (what we persist on payments + payment_processing).
 * Accepts legacy labels and UI verbs so validation never conflicts with Approve/Reject buttons.
 */
const OFFICER_REVIEW_APPROVE = "approved";
const OFFICER_REVIEW_REJECT = "rejected";

const resolveOfficerReviewInput = (raw) => {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (["approved", "approve", "verified", "processed"].includes(s)) {
    return OFFICER_REVIEW_APPROVE;
  }
  if (["rejected", "reject"].includes(s)) {
    return OFFICER_REVIEW_REJECT;
  }
  return null;
};

const pickOfficerStatusFromBody = (body) =>
  body?.officer_status ??
  body?.officerStatus ??
  body?.action ??
  body?.decision;

const isFinalOfficerStatus = (raw) => {
  const s = String(raw || "").trim().toLowerCase();
  return ["approved", "rejected", "verified", "processed"].includes(s);
};

/**
 * Receipt eligibility: financial success is payment_status = 'paid' only (never 'approved' — that is officer_status).
 * officer_status gates institutional approval (approved | verified | processed).
 */
const studentReceiptAllowed = (paymentStatus, officerStatus) => {
  const ps = String(paymentStatus || "").trim().toLowerCase();
  if (ps !== "paid") return false;
  const o = String(officerStatus || "").trim().toLowerCase();
  if (o === "rejected") return false;
  return ["approved", "verified", "processed"].includes(o);
};

/**
 * Generate sequential receipt number for the current year.
 * Format: SSG-<YEAR>-<4 digit sequence>
 * Counts existing non-null receipt_numbers for the year.
 */
const generateReceiptNumber = async (conn) => {
  const year = new Date().getFullYear();
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS count FROM payments WHERE YEAR(receipt_issued_at) = ? AND receipt_number IS NOT NULL`,
    [year]
  );
  const nextNumber = (rows[0].count || 0) + 1;
  return `SSG-${year}-${String(nextNumber).padStart(4, "0")}`;
};

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
        s.enrollment_status,
        u.status AS user_account_status,
        f.fee_id,
        f.fee_name,
        f.description,
        f.amount,
        f.status AS fee_status
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
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

    const payerStatus = String(studentFee.user_account_status ?? "")
      .trim()
      .toLowerCase();
    if (payerStatus !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const enrollment = String(studentFee.enrollment_status ?? "")
      .trim()
      .toLowerCase();
    if (enrollment !== "enrolled") {
      return res.status(403).json({ message: "Student is not enrolled" });
    }

    if (String(studentFee.fee_status || "").trim().toLowerCase() !== "active") {
      return res
        .status(400)
        .json({ message: "This fee is inactive and cannot be paid." });
    }

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

    // Extract actual payment ID and payment method from the first payment in the webhook
    const firstPayment = resourceAttributes.payments?.[0];
    const paymentId = firstPayment?.id;
    const paymentMethod =
    firstPayment?.attributes?.source?.type ||   // ✅ GCash, card, etc.
    firstPayment?.attributes?.payment_method || // fallback
    'unknown';

    const studentFeeIdRaw = metadata.student_fee_id;
    const studentFeeId = studentFeeIdRaw ? Number(studentFeeIdRaw) : null;

    console.log("eventType:", eventType);
    console.log("checkoutId:", checkoutId);
    console.log("paymentId:", paymentId);
    console.log("paymentMethod:", paymentMethod);
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
           payment_method = ?,
           paid_at = NOW()
       WHERE payment_id = ?`,
      [paymentId || checkoutId, paymentMethod, matchedPayment.payment_id]
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
        const reference = paymentId || info.paymongo_reference || checkoutId;

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
        p.officer_status,
        p.amount,
        p.paid_at,
        p.created_at,
        p.paymongo_checkout_id,
        p.paymongo_reference,
        p.receipt_number,
        f.fee_name,
        f.description,
        f.due_date,
        sf.assignment_status,
        pp_latest.remarks AS review_remarks,
        pp_latest.processed_at AS reviewed_at,
        pp_latest.processed_by AS reviewed_by
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN fees f ON sf.fee_id = f.fee_id
      LEFT JOIN (
        SELECT
          pp1.payment_id,
          pp1.remarks,
          pp1.processed_at,
          pp1.processed_by
        FROM payment_processing pp1
        INNER JOIN (
          SELECT payment_id, MAX(processing_id) AS mid
          FROM payment_processing
          GROUP BY payment_id
        ) t ON pp1.processing_id = t.mid
      ) pp_latest ON p.payment_id = pp_latest.payment_id
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
        SUM(CASE WHEN officer_status IN ('approved', 'verified', 'processed') THEN 1 ELSE 0 END) AS approved_payments,
        SUM(CASE WHEN officer_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_payments,
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
  const { payment_id } = req.params;
  const { remarks, processed_by } = req.body;

  const rawStatus = pickOfficerStatusFromBody(req.body);
  if (rawStatus === undefined || rawStatus === null || String(rawStatus).trim() === "") {
    return res.status(400).json({ message: "officer_status is required" });
  }

  const target = resolveOfficerReviewInput(rawStatus);
  if (!target) {
    return res.status(400).json({
      message:
        "Invalid officer_status. Use an approval value (approved, approve, verified, processed) or a rejection value (rejected, reject).",
    });
  }

  if (target === OFFICER_REVIEW_REJECT) {
    const reason = String(remarks || "").trim();
    if (!reason) {
      return res.status(400).json({
        message: "A rejection reason is required before submitting.",
      });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [paymentRows] = await conn.query(
      `SELECT payment_id, payment_status, officer_status, student_fee_id
       FROM payments WHERE payment_id = ?`,
      [payment_id]
    );

    if (paymentRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Payment not found" });
    }

    const pay = paymentRows[0];
    const currentPs = String(pay.payment_status || "").toLowerCase();

    if (currentPs === "rejected") {
      await conn.rollback();
      return res
        .status(400)
        .json({ message: "This payment has already been reviewed." });
    }

    if (isFinalOfficerStatus(pay.officer_status)) {
      await conn.rollback();
      return res
        .status(400)
        .json({ message: "This payment has already been reviewed." });
    }

    if (target === OFFICER_REVIEW_APPROVE) {
      /* Schema: payment_status ENUM(pending,paid,failed,expired,rejected); officer_status ENUM includes approved. */
      if (currentPs === "pending") {
        await conn.query(
          `UPDATE payments
           SET payment_status = 'paid',
               officer_status = 'approved',
               paid_at = COALESCE(paid_at, NOW())
           WHERE payment_id = ?`,
          [payment_id]
        );
        await conn.query(
          `UPDATE student_fees SET assignment_status = 'paid' WHERE student_fee_id = ?`,
          [pay.student_fee_id]
        );
      } else if (currentPs === "paid") {
        await conn.query(
          `UPDATE payments SET officer_status = 'approved' WHERE payment_id = ?`,
          [payment_id]
        );
      } else {
        await conn.rollback();
        return res.status(400).json({
          message: "Only pending or paid payments can be approved.",
        });
      }

      const remarkText =
        remarks !== undefined && remarks !== null
          ? String(remarks).trim() || null
          : null;
      await conn.query(
        `INSERT INTO payment_processing (payment_id, processed_by, processing_status, remarks, processed_at)
         VALUES (?, ?, 'approved', ?, NOW())`,
        [payment_id, processed_by || null, remarkText]
      );

      // Generate receipt number if not exists and eligible
      const [receiptCheck] = await conn.query(
        `SELECT receipt_number FROM payments WHERE payment_id = ?`,
        [payment_id]
      );
      if (!receiptCheck[0].receipt_number) {
        const receiptNumber = await generateReceiptNumber(conn);
        await conn.query(
          `UPDATE payments SET receipt_number = ?, receipt_issued_at = NOW(), receipt_issued_by = ? WHERE payment_id = ?`,
          [receiptNumber, processed_by, payment_id]
        );
      }
    } else {
      /* Reject: payment_status must be 'rejected' (add ENUM value via migrations/001_add_payment_status_rejected.sql). */
      const reason = String(remarks || "").trim();
      await conn.query(
        `UPDATE payments
         SET payment_status = 'rejected',
             officer_status = 'rejected'
         WHERE payment_id = ?`,
        [payment_id]
      );
      await conn.query(
        `UPDATE student_fees SET assignment_status = 'unpaid' WHERE student_fee_id = ?`,
        [pay.student_fee_id]
      );
      await conn.query(
        `INSERT INTO payment_processing (payment_id, processed_by, processing_status, remarks, processed_at)
         VALUES (?, ?, 'rejected', ?, NOW())`,
        [payment_id, processed_by || null, reason]
      );
    }

    await conn.commit();
    res.json({
      message: "Officer payment status updated",
      affectedRows: 1,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    console.error("Update officer payment status error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

const getReceiptByPaymentId = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const audience = String(req.query.audience || "").trim().toLowerCase();

    const [rows] = await pool.query(
      `
      SELECT
        p.payment_id,
        p.amount,
        p.payment_status,
        p.officer_status,
        p.payment_method,
        p.paymongo_reference,
        p.receipt_number,
        p.paid_at,
        p.receipt_issued_by,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        f.fee_name,
        o.first_name AS officer_first_name,
        o.middle_name AS officer_middle_name,
        o.last_name AS officer_last_name,
        o.position AS officer_position,
        fo.first_name AS fallback_officer_first_name,
        fo.middle_name AS fallback_officer_middle_name,
        fo.last_name AS fallback_officer_last_name,
        fo.position AS fallback_officer_position,
        pp.processed_by AS fallback_officer_user_id
      FROM payments p
      JOIN student_fees sf ON p.student_fee_id = sf.student_fee_id
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      LEFT JOIN users u ON p.receipt_issued_by = u.user_id
      LEFT JOIN officers o ON u.user_id = o.user_id
      LEFT JOIN payment_processing pp ON p.payment_id = pp.payment_id AND pp.processing_status = 'approved'
      LEFT JOIN users fu ON pp.processed_by = fu.user_id
      LEFT JOIN officers fo ON fu.user_id = fo.user_id
      WHERE p.payment_id = ?
      `,
      [payment_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const row = rows[0];

    if (audience === "student") {
      if (!studentReceiptAllowed(row.payment_status, row.officer_status)) {
        const ps = String(row.payment_status || "").toLowerCase();
        const os = String(row.officer_status || "").toLowerCase();
        if (ps === "rejected" || os === "rejected") {
          return res.status(403).json({
            message:
              "Receipt is not available for rejected payments. See Payment History for the reason.",
          });
        }
        return res.status(403).json({
          message:
            "Receipt is not available until this payment has been approved by an officer.",
        });
      }
    }

    // Determine approving officer
    let approvedBy = null;
    if (row.officer_first_name) {
      const fullName = [row.officer_first_name, row.officer_middle_name, row.officer_last_name]
        .filter(Boolean)
        .join(" ");
      approvedBy = `${fullName} (${row.officer_position})`;
    } else if (row.fallback_officer_first_name) {
      const fullName = [row.fallback_officer_first_name, row.fallback_officer_middle_name, row.fallback_officer_last_name]
        .filter(Boolean)
        .join(" ");
      approvedBy = `${fullName} (${row.fallback_officer_position})`;
    }

    row.approved_by = approvedBy;

    res.json(row);
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
      WHERE pp.processing_status IN ('approved', 'rejected', 'verified', 'processed')
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