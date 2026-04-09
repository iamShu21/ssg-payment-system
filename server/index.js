const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

console.log("[DEBUG] Loading routes...");
const authRoutes = require("./routes/authRoutes");
console.log("[DEBUG] Auth routes loaded successfully");
const studentRoutes = require("./routes/studentRoutes");
console.log("[DEBUG] Student routes loaded successfully");
const officerRoutes = require("./routes/officerRoutes");
console.log("[DEBUG] Officer routes loaded successfully");
const feeRoutes = require("./routes/feeRoutes");
console.log("[DEBUG] Fee routes loaded successfully");
const assignmentRoutes = require("./routes/assignmentRoutes");
console.log("[DEBUG] Assignment routes loaded successfully");
const studentFeeRoutes = require("./routes/studentFeeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  const [rows] = await pool.query("SHOW TABLES");
  res.json(rows);
});

app.use("/api/auth", authRoutes);
console.log("[DEBUG] Auth routes registered at /api/auth");
app.use("/api/students", studentRoutes);
console.log("[DEBUG] Student routes registered at /api/students");
app.use("/api/officers", officerRoutes);
console.log("[DEBUG] Officer routes registered at /api/officers");
app.use("/api/fees", feeRoutes);
console.log("[DEBUG] Fee routes registered at /api/fees");
app.use("/api/assignments", assignmentRoutes);
console.log("[DEBUG] Assignment routes registered at /api/assignments");
app.use("/api/student-fees", studentFeeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});