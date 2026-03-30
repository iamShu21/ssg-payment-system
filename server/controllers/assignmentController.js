const pool = require("../db");

const assignFeeToAllStudents = async (req, res) => {
  try {
    const { fee_id, performed_by } = req.body;

    if (!fee_id) {
      return res.status(400).json({ message: "fee_id is required" });
    }

    const [feeRows] = await pool.query(
      "SELECT * FROM fees WHERE fee_id = ?",
      [fee_id]
    );

    if (feeRows.length === 0) {
      return res.status(404).json({ message: "Fee not found" });
    }

    const [students] = await pool.query(`
      SELECT student_id
      FROM students
      WHERE enrollment_status = 'enrolled'
    `);

    if (students.length === 0) {
      return res.status(400).json({ message: "No enrolled students found" });
    }

    let assignedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const [existing] = await pool.query(
        "SELECT * FROM student_fees WHERE student_id = ? AND fee_id = ?",
        [student.student_id, fee_id]
      );

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      await pool.query(
        `INSERT INTO student_fees (student_id, fee_id, assignment_status)
         VALUES (?, ?, 'unpaid')`,
        [student.student_id, fee_id]
      );

      // Additive notification insert only; do not block assignment flow on failure.
      try {
        const [studentUserRows] = await pool.query(
          `
          SELECT s.user_id, f.fee_name, f.due_date
          FROM students s
          JOIN fees f ON f.fee_id = ?
          WHERE s.student_id = ?
          LIMIT 1
          `,
          [fee_id, student.student_id]
        );

        if (studentUserRows.length > 0 && studentUserRows[0].user_id) {
          const feeName = studentUserRows[0].fee_name || `Fee #${fee_id}`;
          const dueDate = studentUserRows[0].due_date
            ? new Date(studentUserRows[0].due_date).toLocaleDateString()
            : "N/A";
          await pool.query(
            `
            INSERT INTO notifications (user_id, title, message, is_read)
            VALUES (?, 'New Fee Assigned', ?, 0)
            `,
            [
              studentUserRows[0].user_id,
              `A new fee "${feeName}" has been assigned to you. Due date: ${dueDate}.`,
            ]
          );
        }
      } catch (notificationError) {
        console.error("Assignment notification insert error:", notificationError);
      }

      assignedCount++;
    }

    if (performed_by) {
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
        VALUES (?, 'ASSIGN_FEE_ALL', 'fee', ?, ?)
        `,
        [performed_by, fee_id, `Assigned fee ${fee_id} to all enrolled students`]
      );
    }

    res.status(201).json({
      message: "Fee assignment completed",
      fee_id,
      assignedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Assign fee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getStudentFeeAssignments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        sf.student_fee_id,
        sf.assignment_status,
        sf.assigned_at,
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
        f.description,
        f.amount,
        f.due_date
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.student_id
      JOIN fees f ON sf.fee_id = f.fee_id
      ORDER BY sf.student_fee_id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAssignmentSummary = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        f.fee_id,
        f.fee_name,
        COUNT(sf.student_fee_id) AS total_assigned,
        SUM(CASE WHEN sf.assignment_status = 'paid' THEN 1 ELSE 0 END) AS total_paid,
        SUM(CASE WHEN sf.assignment_status <> 'paid' THEN 1 ELSE 0 END) AS total_unpaid
      FROM fees f
      LEFT JOIN student_fees sf ON f.fee_id = sf.fee_id
      GROUP BY f.fee_id, f.fee_name
      ORDER BY f.fee_id DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Get assignment summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  assignFeeToAllStudents,
  getStudentFeeAssignments,
  getAssignmentSummary,
};
