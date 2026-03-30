const express = require("express");
const router = express.Router();

const {
  createFee,
  getFees,
  getFeeById,
  updateFee,
} = require("../controllers/feeController");

router.post("/", createFee);
router.get("/", getFees);
router.get("/:fee_id", getFeeById);
router.put("/:fee_id", updateFee);

module.exports = router;
