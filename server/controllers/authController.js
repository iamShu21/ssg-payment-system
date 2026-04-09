const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await pool.query(
      `SELECT u.*, s.student_number
       FROM users u
       LEFT JOIN students s ON s.user_id = u.user_id
       WHERE u.username = ? OR s.student_number = ?`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const accountStatus = String(user.status ?? "")
      .trim()
      .toLowerCase();
    if (accountStatus !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        u.user_id,
        u.username,
        u.role,
        u.status,
        u.created_at,
        s.student_id,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.course,
        s.year_level,
        s.section,
        s.email,
        s.enrollment_status
      FROM users u
      LEFT JOIN students s ON u.user_id = s.user_id
      WHERE u.user_id = ?
      `,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body;

    if (!user_id || !current_password || !new_password) {
      return res
        .status(400)
        .json({ message: "user_id, current_password, new_password are required" });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const [rows] = await pool.query("SELECT user_id, password_hash FROM users WHERE user_id = ?", [
      user_id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [newHash, user_id]);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login, getProfile, changePassword };