import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import ReceiptDetailsCard from "../components/ReceiptDetailsCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const StudentReceiptPage = () => {
  const { payment_id } = useParams();
  const { student } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get(
          `/payments/${payment_id}/receipt?audience=student`
        );
        setReceipt(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load receipt.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [payment_id]);

  if (!student?.student_id) {
    return <Navigate to="/" replace />;
  }

  return (
    <PortalLayout title="Receipt View" navItems={studentNav}>
      {loading && <p className="page-message">Loading receipt...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && receipt && (
        <>
          <ReceiptDetailsCard receipt={receipt} />

          <div className="button-row">
            <button className="btn" type="button" onClick={() => downloadReceiptPdf(receipt)}>
              Download Receipt (PDF)
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
              Print Receipt
            </button>
            <Link className="btn btn-secondary" to="/student/payments">
              Back to Payment History
            </Link>
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default StudentReceiptPage;
