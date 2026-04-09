import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { canOfficerReview } from "../utils/paymentReview";

const officerNav = [
  { to: "/officer/dashboard", label: "Dashboard" },
  { to: "/officer/payments", label: "Payments" },
  { to: "/officer/history", label: "Transaction History" },
];

const OfficerPaymentsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [officerStatus, setOfficerStatus] = useState("");
  const [search, setSearch] = useState("");
  const [approveNotes, setApproveNotes] = useState({});
  const [busyPaymentId, setBusyPaymentId] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    paymentId: null,
    reason: "",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (paymentStatus) params.append("payment_status", paymentStatus);
    if (officerStatus) params.append("officer_status", officerStatus);
    if (search.trim()) params.append("search", search.trim());
    return params.toString();
  }, [paymentStatus, officerStatus, search]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/payments/officer${queryString ? `?${queryString}` : ""}`
      );
      setRows(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load officer payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [queryString]);

  const applyApprove = async (paymentId) => {
    try {
      setBusyPaymentId(paymentId);
      await api.patch(`/payments/${paymentId}/officer-status`, {
        officer_status: "approved",
        remarks: approveNotes[paymentId]?.trim() || "",
        processed_by: user?.user_id || null,
      });
      setApproveNotes((prev) => ({ ...prev, [paymentId]: "" }));
      await fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update payment.");
    } finally {
      setBusyPaymentId(null);
    }
  };

  const submitReject = async () => {
    const paymentId = rejectModal.paymentId;
    const reason = rejectModal.reason.trim();
    if (!paymentId || !reason) {
      alert("Please enter a rejection reason.");
      return;
    }
    try {
      setBusyPaymentId(paymentId);
      await api.patch(`/payments/${paymentId}/officer-status`, {
        officer_status: "rejected",
        remarks: reason,
        processed_by: user?.user_id || null,
      });
      setRejectModal({ open: false, paymentId: null, reason: "" });
      await fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject payment.");
    } finally {
      setBusyPaymentId(null);
    }
  };

  return (
    <PortalLayout title="Officer Payments" navItems={officerNav}>
      <div className="card section-card">
        <h3>Filters</h3>
        <div className="filter-grid">
          <div>
            <label className="small-text">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div>
            <label className="small-text">Officer Status</label>
            <select
              value={officerStatus}
              onChange={(e) => setOfficerStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="unreviewed">unreviewed</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="verified">verified (legacy)</option>
              <option value="processed">processed (legacy)</option>
            </select>
          </div>

          <div>
            <label className="small-text">Search</label>
            <input
              type="text"
              placeholder="Student number or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card section-card">
        {loading && <p className="page-message">Loading payments...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Student</th>
                <th>Fee</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Officer Status</th>
                <th>Paid At</th>
                <th>Approval notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const canAct = canOfficerReview(row);
                return (
                  <tr key={row.payment_id}>
                    <td>{row.payment_id}</td>
                    <td>
                      <div>{row.student_name}</div>
                      <div className="small-text">{row.student_number}</div>
                    </td>
                    <td>{row.fee_name}</td>
                    <td>PHP {Number(row.amount).toLocaleString()}</td>
                    <td>
                      <StatusBadge value={row.payment_status} />
                    </td>
                    <td>
                      <StatusBadge value={row.officer_status || "unreviewed"} />
                    </td>
                    <td>
                      {row.paid_at
                        ? new Date(row.paid_at).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Optional notes (approve only)"
                        value={approveNotes[row.payment_id] || ""}
                        onChange={(e) =>
                          setApproveNotes((prev) => ({
                            ...prev,
                            [row.payment_id]: e.target.value,
                          }))
                        }
                        disabled={!canAct}
                      />
                    </td>
                    <td>
                      <div className="button-col">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => applyApprove(row.payment_id)}
                          disabled={
                            busyPaymentId === row.payment_id || !canAct
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            setRejectModal({
                              open: true,
                              paymentId: row.payment_id,
                              reason: "",
                            })
                          }
                          disabled={
                            busyPaymentId === row.payment_id || !canAct
                          }
                        >
                          Reject
                        </button>
                        <Link
                          className="btn btn-dark"
                          to={`/officer/receipt/${row.payment_id}`}
                        >
                          View Receipt
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="small-text">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {rejectModal.open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="card modal-card">
            <h3 id="reject-modal-title">Reject payment</h3>
            <p className="small-text">
              A rejection reason is required. It will be visible to the student.
            </p>
            <label className="small-text" htmlFor="reject-reason">
              Reason / remarks
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              className="modal-textarea"
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((m) => ({ ...m, reason: e.target.value }))
              }
              placeholder="Explain why this payment is rejected."
            />
            <div className="button-row modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setRejectModal({ open: false, paymentId: null, reason: "" })
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={submitReject}
                disabled={busyPaymentId === rejectModal.paymentId}
              >
                {busyPaymentId === rejectModal.paymentId
                  ? "Submitting..."
                  : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default OfficerPaymentsPage;
