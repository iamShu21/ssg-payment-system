/**
 * Officer review helpers — keep in sync with server/controllers/paymentController.js
 * (resolveOfficerReviewInput: approved|approve|verified|processed → approve; rejected|reject → reject)
 */

export const isOfficerFinalized = (officerStatus) => {
  const o = String(officerStatus || "").trim().toLowerCase();
  return ["approved", "rejected", "verified", "processed"].includes(o);
};

/** Student View Receipt / PDF only when paid and officer-approved (legacy verified/processed included). */
export const studentReceiptAllowed = (paymentStatus, officerStatus) => {
  const ps = String(paymentStatus || "").trim().toLowerCase();
  if (ps !== "paid") return false;
  const o = String(officerStatus || "").trim().toLowerCase();
  if (o === "rejected") return false;
  return ["approved", "verified", "processed"].includes(o);
};

export const canOfficerReview = (row) => {
  if (String(row.payment_status || "").toLowerCase() === "rejected") return false;
  return !isOfficerFinalized(row.officer_status);
};

/** Badge value for student-facing combined status. */
export const studentReviewStatusLabel = (row) => {
  const ps = String(row.payment_status || "").toLowerCase();
  const o = String(row.officer_status || "").trim().toLowerCase();
  if (ps === "rejected" || o === "rejected") return "rejected";
  if (ps === "paid" && (!o || o === "unreviewed")) return "pending_review";
  if (
    ps === "paid" &&
    ["approved", "verified", "processed"].includes(o)
  ) {
    return "paid";
  }
  return ps || "unknown";
};
