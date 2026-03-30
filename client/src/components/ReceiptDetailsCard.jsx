import StatusBadge from "./StatusBadge";

const ReceiptDetailsCard = ({ receipt }) => {
  const studentName = [receipt?.first_name, receipt?.middle_name, receipt?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card receipt-card" id="receipt-print-area">
      <h2>School Payment Receipt</h2>
      <p className="small-text">Supreme Student Government</p>

      <div className="receipt-grid">
        <div>
          <strong>Receipt Number:</strong> {receipt?.receipt_number || "-"}
        </div>
        <div>
          <strong>Payment ID:</strong> {receipt?.payment_id || "-"}
        </div>
        <div>
          <strong>Student Name:</strong> {studentName || "-"}
        </div>
        <div>
          <strong>Student Number:</strong> {receipt?.student_number || "-"}
        </div>
        <div>
          <strong>Fee Name:</strong> {receipt?.fee_name || "-"}
        </div>
        <div>
          <strong>Amount:</strong> PHP {Number(receipt?.amount || 0).toLocaleString()}
        </div>
        <div>
          <strong>Payment Status:</strong> <StatusBadge value={receipt?.payment_status} />
        </div>
        <div>
          <strong>Paid At:</strong>{" "}
          {receipt?.paid_at ? new Date(receipt.paid_at).toLocaleString() : "-"}
        </div>
        <div>
          <strong>PayMongo Reference:</strong> {receipt?.paymongo_reference || "-"}
        </div>
        <div>
          <strong>Payment Method:</strong> {receipt?.payment_method || "-"}
        </div>
      </div>

      <p className="small-text receipt-footer">
        This receipt is generated from the SSG Payment System records.
      </p>
    </div>
  );
};

export default ReceiptDetailsCard;
