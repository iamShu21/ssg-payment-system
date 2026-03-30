const express = require("express");
const router = express.Router();

console.log("[DEBUG] paymentRoutes.js loaded");

const paymentController = require("../controllers/paymentController");

console.log("[DEBUG] paymentController keys:", Object.keys(paymentController));

router.get("/test", (req, res) => {
  res.json({ message: "payment routes working" });
});

router.get("/officer/summary", paymentController.getOfficerPaymentSummary);
router.get("/officer", paymentController.getOfficerPayments);
router.get("/officer/history", paymentController.getOfficerTransactionHistory);
router.get("/:payment_id/receipt", paymentController.getReceiptByPaymentId);
router.patch("/:payment_id/officer-status", paymentController.updateOfficerPaymentStatus);
router.get("/history/:student_id", paymentController.getPaymentHistoryByStudentId);
router.post("/checkout", paymentController.createCheckoutSession);
router.post("/webhook", paymentController.handleWebhook);

module.exports = router;