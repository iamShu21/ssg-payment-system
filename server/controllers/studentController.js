const pool = require("../db");
const bcrypt = require("bcryptjs");

const ALLOWED_COURSES = [
  "Bachelor of Science in Architecture (BSArchi)",
  "Bachelor of Science in Civil Engineering (BSCE)",
  "Bachelor of Science in Computer Engineering (BSCoE)",
  "Bachelor of Science in Computer Science (BSCS)",
  "Bachelor of Science in Electrical Engineering (BSEE)",
  "Bachelor of Science in Electronics Engineering (BSEcE)",
  "Bachelor of Science in Information Technology (BSIT)",
  "Bachelor of Library and Information Science (BLIS)",
];

const ALLOWED_YEAR_LEVELS = [1, 2, 3, 4, 5];

const testStudent = async (req, res) => {
  console.log("[DEBUG] testStudent endpoint called");
  return res.json({ message: "student routes working" });
};

const createStudent = async (req, res) => {
  console.log("[DEBUG] createStudent called with body:", req.body);
  try {
    const {
      username,
      password,
      student_number,
      first_name,
      middle_name,
      last_name,
      course,
      year_level,
      section,
      email,
      performed_by,
    } = req.body;

    if (
      !username ||
      !password ||
      !student_number ||
      !first_name ||
      !last_name ||
      !course ||
      !year_level
    ) {
      return res.status(400).json({ message: "Please fill in required fields" });
    }

    if (!ALLOWED_COURSES.includes(course)) {
      return res.status(400).json({ message: "Invalid course selected" });
    }

    if (!ALLOWED_YEAR_LEVELS.includes(Number(year_level))) {
      return res.status(400).json({ message: "Invalid year level selected" });
    }

    const [existingUsers] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const [existingStudents] = await pool.query(
      "SELECT * FROM students WHERE student_number = ?",
      [student_number]
    );

    if (existingStudents.length > 0) {
      return res.status(400).json({ message: "Student number already exists" });
    }

    if (email) {
      const [existingEmails] = await pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (existingEmails.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [userResult] = await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES (?, ?, 'student')`,
      [username, password_hash]
    );

    const user_id = userResult.insertId;

    await pool.query(
      `INSERT INTO students
      (user_id, student_number, first_name, middle_name, last_name, course, year_level, section, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        student_number,
        first_name,
        middle_name || null,
        last_name,
        course,
        year_level,
        section || null,
        email || null,
      ]
    );

    if (performed_by) {
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
        VALUES (?, 'CREATE_STUDENT', 'student', ?, ?)
        `,
        [performed_by, user_id, `Created student account with user_id ${user_id}`]
      );
    }

    res.status(201).json({
      message: "Student account created successfully",
      user_id,
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getStudents = async (req, res) => {
  console.log("[DEBUG] getStudents called");
  try {
    const [students] = await pool.query(`
      SELECT 
        s.student_id,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.course,
        s.year_level,
        s.section,
        s.email,
        s.enrollment_status,
        u.user_id,
        u.username,
        u.status,
        u.role
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.student_id DESC
    `);

    res.json(students);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { student_id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        s.student_id,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.course,
        s.year_level,
        s.section,
        s.email,
        s.enrollment_status,
        u.user_id,
        u.username,
        u.status,
        u.role
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.student_id = ?
      `,
      [student_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get student by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { student_id } = req.params;
    const {
      username,
      student_number,
      first_name,
      middle_name,
      last_name,
      course,
      year_level,
      section,
      email,
      enrollment_status,
      user_status,
      performed_by,
    } = req.body;

    const [existingRows] = await pool.query(
      `
      SELECT s.student_id, s.user_id
      FROM students s
      WHERE s.student_id = ?
      `,
      [student_id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const userId = existingRows[0].user_id;

    if (student_number) {
      const [numberRows] = await pool.query(
        `
        SELECT student_id
        FROM students
        WHERE student_number = ? AND student_id <> ?
        `,
        [student_number, student_id]
      );
      if (numberRows.length > 0) {
        return res.status(400).json({ message: "Student number already exists" });
      }
    }

    if (username) {
      const [usernameRows] = await pool.query(
        `
        SELECT user_id
        FROM users
        WHERE username = ? AND user_id <> ?
        `,
        [username, userId]
      );
      if (usernameRows.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    const ALLOWED_ENROLLMENT = ["enrolled", "inactive"];
    const ALLOWED_USER_STATUS = ["active", "inactive"];

    let enrollmentValue = null;
    if (enrollment_status !== undefined && enrollment_status !== null && enrollment_status !== "") {
      const e = String(enrollment_status).trim().toLowerCase();
      if (!ALLOWED_ENROLLMENT.includes(e)) {
        return res
          .status(400)
          .json({ message: "enrollment_status must be enrolled or inactive" });
      }
      enrollmentValue = e;
    }

    let userStatusValue = null;
    if (user_status !== undefined && user_status !== null && user_status !== "") {
      const us = String(user_status).trim().toLowerCase();
      if (!ALLOWED_USER_STATUS.includes(us)) {
        return res.status(400).json({ message: "user_status must be active or inactive" });
      }
      userStatusValue = us;
    }

    if (course !== undefined && course !== null && course !== "" && !ALLOWED_COURSES.includes(course)) {
      return res.status(400).json({ message: "Invalid course selected" });
    }

    if (year_level !== undefined && year_level !== null && year_level !== "" && !ALLOWED_YEAR_LEVELS.includes(Number(year_level))) {
      return res.status(400).json({ message: "Invalid year level selected" });
    }

    await pool.query(
      `
      UPDATE students
      SET
        student_number = COALESCE(?, student_number),
        first_name = COALESCE(?, first_name),
        middle_name = ?,
        last_name = COALESCE(?, last_name),
        course = COALESCE(?, course),
        year_level = COALESCE(?, year_level),
        section = ?,
        email = ?,
        enrollment_status = COALESCE(?, enrollment_status)
      WHERE student_id = ?
      `,
      [
        student_number || null,
        first_name || null,
        middle_name || null,
        last_name || null,
        course || null,
        year_level || null,
        section || null,
        email || null,
        enrollmentValue,
        student_id,
      ]
    );

    await pool.query(
      `
      UPDATE users
      SET
        username = COALESCE(?, username),
        status = COALESCE(?, status)
      WHERE user_id = ?
      `,
      [username || null, userStatusValue, userId]
    );

    if (performed_by) {
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
        VALUES (?, 'UPDATE_STUDENT', 'student', ?, ?)
        `,
        [performed_by, student_id, `Updated student ${student_id}`]
      );
    }

    res.json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createStudent,
  getStudents,
  testStudent,
  getStudentById,
  updateStudent,
};