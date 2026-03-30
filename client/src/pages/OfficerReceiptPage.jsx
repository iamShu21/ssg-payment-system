import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import ReceiptDetailsCard from "../components/ReceiptDetailsCard";
import api from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const officerNav = [
  { to: "/officer/dashboard", label: "Dashboard" },
  { to: "/officer/payments", label: "Payments" },
  { to: "/officer/history", label: "Transaction History" },
];

const OfficerReceiptPage = () => {
  const { payment_id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get(`/payments/${payment_id}/receipt`);
        setReceipt(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load receipt.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [payment_id]);

  return (
    <PortalLayout title="Receipt View" navItems={officerNav}>
      {loading && <p className="page-message">Loading receipt...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && receipt && (
        <>
          <ReceiptDetailsCard receipt={receipt} />

          <div className="button-row">
            <button className="btn" type="button" onClick={() => downloadReceiptPdf(receipt)}>
              Download Receipt (PDF)
            </button>
            <button className="btn" onClick={() => window.print()}>
              Print Receipt
            </button>
            <Link className="btn btn-secondary" to="/officer/payments">
              Back to Payments
            </Link>
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default OfficerReceiptPage;
