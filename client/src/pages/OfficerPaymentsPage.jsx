import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
  const [remarks, setRemarks] = useState({});
  const [busyPaymentId, setBusyPaymentId] = useState(null);

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
      const response = await api.get(`/payments/officer${queryString ? `?${queryString}` : ""}`);
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

  const applyOfficerAction = async (paymentId, status) => {
    try {
      setBusyPaymentId(paymentId);
      await api.patch(`/payments/${paymentId}/officer-status`, {
        officer_status: status,
        remarks: remarks[paymentId] || "",
        processed_by: user?.user_id || null,
      });
      await fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update payment.");
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
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
            </select>
          </div>

          <div>
            <label className="small-text">Officer Status</label>
            <select value={officerStatus} onChange={(e) => setOfficerStatus(e.target.value)}>
              <option value="">All</option>
              <option value="unreviewed">unreviewed</option>
              <option value="verified">verified</option>
              <option value="processed">processed</option>
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
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.payment_id}>
                  <td>{row.payment_id}</td>
                  <td>
                    <div>{row.student_name}</div>
                    <div className="small-text">{row.student_number}</div>
                  </td>
                  <td>{row.fee_name}</td>
                  <td>PHP {Number(row.amount).toLocaleString()}</td>
                  <td><StatusBadge value={row.payment_status} /></td>
                  <td><StatusBadge value={row.officer_status || "unreviewed"} /></td>
                  <td>{row.paid_at ? new Date(row.paid_at).toLocaleString() : "-"}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="Officer remarks"
                      value={remarks[row.payment_id] || ""}
                      onChange={(e) =>
                        setRemarks((prev) => ({ ...prev, [row.payment_id]: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <div className="button-col">
                      <button
                        className="btn btn-secondary"
                        onClick={() => applyOfficerAction(row.payment_id, "verified")}
                        disabled={busyPaymentId === row.payment_id || row.payment_status !== "paid"}
                      >
                        Verify
                      </button>
                      <button
                        className="btn"
                        onClick={() => applyOfficerAction(row.payment_id, "processed")}
                        disabled={busyPaymentId === row.payment_id || row.payment_status !== "paid"}
                      >
                        Process
                      </button>
                      <Link className="btn btn-dark" to={`/officer/receipt/${row.payment_id}`}>
                        Receipt
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
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
    </PortalLayout>
  );
};

export default OfficerPaymentsPage;
