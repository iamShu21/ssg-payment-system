const express = require("express");
const router = express.Router();

console.log("[DEBUG] studentRoutes.js file loaded");
const {
  createStudent,
  getStudents,
  testStudent,
  getStudentById,
  updateStudent,
} = require("../controllers/studentController");

router.get("/test", testStudent);
router.post("/", createStudent);
router.get("/", getStudents);
router.get("/:student_id", getStudentById);
router.put("/:student_id", updateStudent);

console.log("[DEBUG] Student routes defined: GET /test, POST /, GET /");
module.exports = router;