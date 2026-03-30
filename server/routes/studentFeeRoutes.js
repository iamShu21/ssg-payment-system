const express = require("express");
const router = express.Router();
const { getFeesByStudentId } = require("../controllers/studentFeeController");

router.get("/:student_id", getFeesByStudentId);

module.exports = router;
