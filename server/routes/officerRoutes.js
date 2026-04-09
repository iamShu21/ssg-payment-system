const express = require("express");
const router = express.Router();

const {
  createOfficer,
  getOfficers,
  getOfficerById,
  updateOfficer,
} = require("../controllers/officerController");

router.post("/", createOfficer);
router.get("/", getOfficers);
router.get("/:officer_id", getOfficerById);
router.put("/:officer_id", updateOfficer);

module.exports = router;
