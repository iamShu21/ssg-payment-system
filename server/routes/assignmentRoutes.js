const express = require("express");
const router = express.Router();

const {
  assignFeeToAllStudents,
  getStudentFeeAssignments,
  getAssignmentSummary,
} = require("../controllers/assignmentController");

router.post("/assign-all", assignFeeToAllStudents);
router.get("/", getStudentFeeAssignments);
router.get("/summary", getAssignmentSummary);

module.exports = router;
