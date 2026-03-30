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
        f.due_date
      FROM student_fees sf
      JOIN fees f ON sf.fee_id = f.fee_id
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
