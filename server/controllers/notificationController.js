const pool = require("../db");

const getNotificationsByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT notification_id, user_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY notification_id DESC
      `,
      [user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const [result] = await pool.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE notification_id = ?
      `,
      [notification_id]
    );
    res.json({ message: "Notification marked as read", affectedRows: result.affectedRows });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getNotificationsByUserId,
  markNotificationAsRead,
};
