import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const StudentPaymentHistoryPage = () => {
  const { student } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get(`/payments/history/${student.student_id}`);
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    };

    if (student?.student_id) {
      fetchHistory();
    }
  }, [student]);

  const handleDownloadReceipt = async (paymentId) => {
    try {
      setDownloadingId(paymentId);
      const response = await api.get(`/payments/${paymentId}/receipt`);
      downloadReceiptPdf(response.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to download receipt.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!student?.student_id) {
    return <Navigate to="/" replace />;
  }

  return (
    <PortalLayout title="Payment History" navItems={studentNav}>
      <div className="card">
        {loading && <p className="page-message">Loading payment history...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Fee</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Assignment Status</th>
                <th>Paid At</th>
                <th>Reference</th>
                <th>Receipt #</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.payment_id}>
                  <td>{row.payment_id}</td>
                  <td>{row.fee_name}</td>
                  <td>PHP {Number(row.amount).toLocaleString()}</td>
                  <td><StatusBadge value={row.payment_status} /></td>
                  <td><StatusBadge value={row.assignment_status} /></td>
                  <td>{row.paid_at ? new Date(row.paid_at).toLocaleString() : "-"}</td>
                  <td>{row.paymongo_reference || row.paymongo_checkout_id || "-"}</td>
                  <td>{row.receipt_number || "-"}</td>
                  <td>
                    {row.payment_status === "paid" ? (
                      <div className="button-col">
                        <Link className="btn btn-secondary" to={`/student/receipt/${row.payment_id}`}>
                          View Receipt
                        </Link>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleDownloadReceipt(row.payment_id)}
                          disabled={downloadingId === row.payment_id}
                        >
                          {downloadingId === row.payment_id
                            ? "Downloading..."
                            : "Download PDF"}
                        </button>
                      </div>
                    ) : (
                      <span className="small-text">Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="small-text">
                    No payment history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
};

export default StudentPaymentHistoryPage;
