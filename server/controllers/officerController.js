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

const ALLOWED_POSITIONS = ["President", "Vice President", "Treasurer"];
const ALLOWED_USER_STATUS = ["active", "inactive"];

/**
 * Email validation - stricter than HTML5 type="email"
 * Requires at least one dot in domain
 */
const isValidEmail = (email) => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Philippine mobile number validation
 * Must be exactly 11 digits, starts with 9
 */
const isValidPhilippinePhone = (phone) => {
  if (!phone) return true; // Phone is optional
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 11 && cleaned.startsWith("9");
};

const createOfficer = async (req, res) => {
  try {
    const {
      username,
      password,
      first_name,
      middle_name,
      last_name,
      position,
      course,
      email,
      user_status = "active",
      performed_by,
    } = req.body;

    if (!username || !password || !first_name || !last_name || !position || !course) {
      return res.status(400).json({ message: "Please fill in required fields" });
    }

    if (!ALLOWED_POSITIONS.includes(position)) {
      return res.status(400).json({ message: "Invalid position selected" });
    }

    if (!ALLOWED_COURSES.includes(course)) {
      return res.status(400).json({ message: "Invalid course selected" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const normalizedStatus = String(user_status).trim().toLowerCase();
    if (!ALLOWED_USER_STATUS.includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid user status" });
    }

    const [existingUsers] = await pool.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    if (email) {
      const [existingEmails] = await pool.query(
        "SELECT user_id FROM users WHERE email = ?",
        [email]
      );
      if (existingEmails.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const [existingPositions] = await pool.query(
      "SELECT user_id FROM officers WHERE position = ?",
      [position]
    );
    if (existingPositions.length > 0) {
      return res.status(400).json({ message: "Position already occupied" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [userResult] = await pool.query(
      `INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'ssg_officer', ?)`,
      [username, password_hash, normalizedStatus]
    );

    const user_id = userResult.insertId;
    const [officerResult] = await pool.query(
      `INSERT INTO officers
       (user_id, first_name, middle_name, last_name, position, course, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        first_name,
        middle_name || null,
        last_name,
        position,
        course,
        email || null,
      ]
    );

    const officer_id = officerResult.insertId;

    if (performed_by) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
         VALUES (?, 'CREATE_OFFICER', 'officer', ?, ?)`,
        [performed_by, officer_id, `Created officer account with user_id ${user_id}`]
      );
    }

    res.status(201).json({ message: "Officer account created successfully", officer_id });
  } catch (error) {
    console.error("Create officer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOfficers = async (req, res) => {
  try {
    const [officers] = await pool.query(`
      SELECT
        o.officer_id,
        u.user_id,
        u.username,
        u.status,
        u.role,
        o.first_name,
        o.middle_name,
        o.last_name,
        o.position,
        o.course,
        o.email
      FROM officers o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.officer_id DESC
    `);

    res.json(officers);
  } catch (error) {
    console.error("Get officers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOfficerById = async (req, res) => {
  try {
    const { officer_id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        o.officer_id,
        u.user_id,
        u.username,
        u.status,
        u.role,
        o.first_name,
        o.middle_name,
        o.last_name,
        o.position,
        o.course,
        o.email
      FROM officers o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.officer_id = ?
      `,
      [officer_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Officer not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get officer by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateOfficer = async (req, res) => {
  try {
    const { officer_id } = req.params;
    const {
      username,
      first_name,
      middle_name,
      last_name,
      position,
      course,
      email,
      user_status,
      performed_by,
    } = req.body;

    const [existingRows] = await pool.query(
      `
      SELECT o.officer_id, o.user_id
      FROM officers o
      WHERE o.officer_id = ?
      `,
      [officer_id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Officer not found" });
    }

    const userId = existingRows[0].user_id;

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

    if (position !== undefined && position !== null && position !== "" && !ALLOWED_POSITIONS.includes(position)) {
      return res.status(400).json({ message: "Invalid position selected" });
    }

    if (course !== undefined && course !== null && course !== "" && !ALLOWED_COURSES.includes(course)) {
      return res.status(400).json({ message: "Invalid course selected" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    let userStatusValue = null;
    if (user_status !== undefined && user_status !== null && user_status !== "") {
      const statusValue = String(user_status).trim().toLowerCase();
      if (!ALLOWED_USER_STATUS.includes(statusValue)) {
        return res.status(400).json({ message: "user_status must be active or inactive" });
      }
      userStatusValue = statusValue;
    }

    await pool.query(
      `
      UPDATE officers
      SET
        first_name = COALESCE(?, first_name),
        middle_name = ?,
        last_name = COALESCE(?, last_name),
        position = COALESCE(?, position),
        course = COALESCE(?, course),
        email = ?
      WHERE officer_id = ?
      `,
      [
        first_name || null,
        middle_name || null,
        last_name || null,
        position || null,
        course || null,
        email || null,
        officer_id,
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
        `INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
         VALUES (?, 'UPDATE_OFFICER', 'officer', ?, ?)`,
        [performed_by, officer_id, `Updated officer ${officer_id}`]
      );
    }

    res.json({ message: "Officer updated successfully" });
  } catch (error) {
    console.error("Update officer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOfficer,
  getOfficers,
  getOfficerById,
  updateOfficer,
};
