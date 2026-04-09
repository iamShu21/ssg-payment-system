const express = require("express");
const router = express.Router();

const {
  getAdminDashboardSummary,
  getReportsOverview,
  getPerFeeCollectionSummary,
  getAuditLogs,
  getUnpaidStudentsPerFee,
  getDailyCollectionReport,
  getMonthlyCollectionReport,
} = require("../controllers/adminController");

router.get("/dashboard-summary", getAdminDashboardSummary);
router.get("/reports/overview", getReportsOverview);
router.get("/reports/per-fee", getPerFeeCollectionSummary);
router.get("/reports/daily-collection", getDailyCollectionReport);
router.get("/reports/monthly-collection", getMonthlyCollectionReport);
router.get("/reports/unpaid-students/:fee_id", getUnpaidStudentsPerFee);
router.get("/audit-logs", getAuditLogs);

module.exports = router;
