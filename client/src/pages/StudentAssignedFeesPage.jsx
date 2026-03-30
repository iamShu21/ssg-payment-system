import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const StudentAssignedFeesPage = () => {
  const { student } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const response = await api.get(`/student-fees/${student.student_id}`);
        setFees(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load assigned fees.");
      } finally {
        setLoading(false);
      }
    };

    if (student?.student_id) {
      fetchFees();
    }
  }, [student]);

  const handlePayNow = async (studentFeeId) => {
    try {
      setProcessingId(studentFeeId);
      const response = await api.post("/payments/checkout", {
        student_fee_id: studentFeeId,
      });

      const checkoutUrl = response.data.checkout_url;
      if (!checkoutUrl) {
        alert("Checkout URL not found.");
        return;
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create checkout session.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      setDownloadingPaymentId(paymentId);
      const response = await api.get(`/payments/${paymentId}/receipt`);
      downloadReceiptPdf(response.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to download receipt.");
    } finally {
      setDownloadingPaymentId(null);
    }
  };

  if (!student?.student_id) {
    return <Navigate to="/" replace />;
  }

  return (
    <PortalLayout title="Assigned Fees" navItems={studentNav}>
      <div className="card">
        {loading && <p className="page-message">Loading assigned fees...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Fee Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const canPay = fee.assignment_status !== "paid";
                return (
                  <tr key={fee.student_fee_id}>
                    <td>{fee.fee_name}</td>
                    <td>PHP {Number(fee.amount).toLocaleString()}</td>
                    <td>{fee.due_date ? new Date(fee.due_date).toLocaleDateString() : "-"}</td>
                    <td>
                      <span className={`status status-${fee.assignment_status}`}>
                        {fee.assignment_status}
                      </span>
                    </td>
                    <td>
                      {canPay ? (
                        <button
                          className="btn"
                          onClick={() => handlePayNow(fee.student_fee_id)}
                          disabled={processingId === fee.student_fee_id}
                        >
                          {processingId === fee.student_fee_id ? "Processing..." : "Pay Now"}
                        </button>
                      ) : (
                        <div className="button-col">
                          {fee.payment_id ? (
                            <>
                              <Link className="btn btn-secondary" to={`/student/receipt/${fee.payment_id}`}>
                                View Receipt
                              </Link>
                              <button
                                className="btn"
                                type="button"
                                onClick={() => handleDownloadReceipt(fee.payment_id)}
                                disabled={downloadingPaymentId === fee.payment_id}
                              >
                                {downloadingPaymentId === fee.payment_id
                                  ? "Downloading..."
                                  : "Download PDF"}
                              </button>
                            </>
                          ) : (
                            <span className="small-text">Paid (view in Payment History)</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {fees.length === 0 && (
                <tr>
                  <td colSpan={5} className="small-text">
                    No assigned fees found.
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

export default StudentAssignedFeesPage;
