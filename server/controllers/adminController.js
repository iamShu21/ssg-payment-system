const pool = require("../db");

const getAdminDashboardSummary = async (req, res) => {
  try {
    const [[students]] = await pool.query(
      `SELECT COUNT(*) AS total_students FROM students`
    );
    const [[fees]] = await pool.query(
      `SELECT COUNT(*) AS active_fees FROM fees WHERE status = 'active' OR status IS NULL`
    );
    const [[assignments]] = await pool.query(
      `SELECT COUNT(*) AS total_assignments FROM student_fees`
    );
    const [[collections]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_collections FROM payments WHERE payment_status = 'paid'`
    );

    res.json({
      total_students: students.total_students,
      active_fees: fees.active_fees,
      total_assignments: assignments.total_assignments,
      total_collections: Number(collections.total_collections || 0),
    });
  } catch (error) {
    console.error("Get admin dashboard summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getReportsOverview = async (req, res) => {
  try {
    const [[collections]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_collections FROM payments WHERE payment_status = 'paid'`
    );

    const [[statusSummary]] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN assignment_status = 'paid' THEN 1 ELSE 0 END) AS total_paid_assignments,
        SUM(CASE WHEN assignment_status <> 'paid' THEN 1 ELSE 0 END) AS total_unpaid_assignments
      FROM student_fees
      `
    );

    res.json({
      total_collections: Number(collections.total_collections || 0),
      paid_vs_unpaid: statusSummary,
    });
  } catch (error) {
    console.error("Get reports overview error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPerFeeCollectionSummary = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        f.fee_id,
        f.fee_name,
        COUNT(sf.student_fee_id) AS total_assigned,
        SUM(CASE WHEN sf.assignment_status = 'paid' THEN 1 ELSE 0 END) AS total_paid_count,
        SUM(CASE WHEN sf.assignment_status <> 'paid' THEN 1 ELSE 0 END) AS total_unpaid_count,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) AS total_collected
      FROM fees f
      LEFT JOIN student_fees sf ON f.fee_id = sf.fee_id
      LEFT JOIN payments p ON sf.student_fee_id = p.student_fee_id
      GROUP BY f.fee_id, f.fee_name
      ORDER BY f.fee_id DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Get per-fee summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.audit_id,
        a.user_id,
        u.username,
        a.action,
        a.target_type,
        a.target_id,
        a.description,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ORDER BY a.audit_id DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUnpaidStudentsPerFee = async (req, res) => {
  try {
    const { fee_id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        sf.student_fee_id,
        sf.assignment_status,
        s.student_id,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.course,
        s.year_level,
        s.section,
        f.fee_id,
        f.fee_name,
        f.amount
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      WHERE sf.fee_id = ? AND sf.assignment_status <> 'paid'
      ORDER BY s.student_number ASC
      `,
      [fee_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get unpaid students per fee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyCollectionReport = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        DATE(p.paid_at) AS payment_date,
        SUM(p.amount) AS total_amount,
        COUNT(p.payment_id) AS transaction_count
      FROM payments p
      WHERE p.payment_status = 'paid'
      AND p.paid_at IS NOT NULL
      GROUP BY DATE(p.paid_at)
      ORDER BY payment_date DESC
      LIMIT 30
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Get daily collection report error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMonthlyCollectionReport = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(p.paid_at, '%Y-%m') AS month,
        SUM(p.amount) AS total_amount,
        COUNT(p.payment_id) AS transaction_count
      FROM payments p
      WHERE p.payment_status = 'paid'
        AND p.paid_at IS NOT NULL
      GROUP BY DATE_FORMAT(p.paid_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get monthly collection report error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminDashboardSummary,
  getReportsOverview,
  getPerFeeCollectionSummary,
  getAuditLogs,
  getUnpaidStudentsPerFee,
  getDailyCollectionReport,
  getMonthlyCollectionReport,
};
