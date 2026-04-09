const pool = require("../db");

const getFeesByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    const [studentRows] = await pool.query(
      "SELECT * FROM students WHERE student_id = ?",
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        sf.student_fee_id,
        sf.assignment_status,
        sf.assigned_at,
        f.fee_id,
        f.fee_name,
        f.description,
        f.amount,
        f.due_date,
        f.status AS fee_status,
        pm.payment_id,
        pm.payment_status AS latest_payment_status,
        pm.officer_status AS latest_officer_status
      FROM student_fees sf
      JOIN fees f ON sf.fee_id = f.fee_id
      LEFT JOIN (
        SELECT
          p.student_fee_id,
          p.payment_id,
          p.payment_status,
          p.officer_status
        FROM payments p
        INNER JOIN (
          SELECT student_fee_id, MAX(payment_id) AS max_pid
          FROM payments
          GROUP BY student_fee_id
        ) latest
          ON p.student_fee_id = latest.student_fee_id
          AND p.payment_id = latest.max_pid
      ) pm ON sf.student_fee_id = pm.student_fee_id
      WHERE sf.student_id = ?
      ORDER BY sf.student_fee_id DESC
      `,
      [student_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get student fees error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getFeesByStudentId };
