const express = require("express");
const router = express.Router();

const {
  getAdminDashboardSummary,
  getReportsOverview,
  getPerFeeCollectionSummary,
  getAuditLogs,
} = require("../controllers/adminController");

router.get("/dashboard-summary", getAdminDashboardSummary);
router.get("/reports/overview", getReportsOverview);
router.get("/reports/per-fee", getPerFeeCollectionSummary);
router.get("/audit-logs", getAuditLogs);

module.exports = router;
