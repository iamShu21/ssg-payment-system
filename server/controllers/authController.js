const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    console.log("req.body:", req.body); // debug
    const { username, password } = req.body;

    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      console.log("User not found for username:", username);
      return res.status(400).json({ message: "User not found" });
    }

    const user = users[0];
    console.log("DB user:", user.username); // debug
    console.log("DB hash:", user.password_hash); // debug

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("bcrypt match:", isMatch); // debug

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login };