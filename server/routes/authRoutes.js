const express = require("express");
const router = express.Router();
const { login, getProfile, changePassword } = require("../controllers/authController");

router.post("/login", login);
router.get("/profile/:user_id", getProfile);
router.patch("/change-password", changePassword);

module.exports = router;