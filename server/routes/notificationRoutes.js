const express = require("express");
const router = express.Router();

const {
  getNotificationsByUserId,
  markNotificationAsRead,
} = require("../controllers/notificationController");

router.get("/:user_id", getNotificationsByUserId);
router.patch("/:notification_id/read", markNotificationAsRead);

module.exports = router;
