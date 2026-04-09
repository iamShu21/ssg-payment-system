import { useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const adminNav = [
  { to: "/moderator/dashboard", label: "Dashboard" },
  { to: "/moderator/students", label: "Students" },
  { to: "/moderator/officers", label: "Officers" },
  { to: "/moderator/fees", label: "Fees" },
  { to: "/moderator/assignments", label: "Assignments" },
  { to: "/moderator/reports", label: "Reports" },
  { to: "/moderator/audit-logs", label: "Audit Logs" },
];

const ModeratorAssignmentsPage = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [feesResponse, summaryResponse] = await Promise.all([
        api.get("/fees"),
        api.get("/assignments/summary"),
      ]);
      setFees(feesResponse.data);
      setSummaryRows(summaryResponse.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assignment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignAll = async () => {
    if (!selectedFeeId) {
      alert("Please select a fee first.");
      return;
    }
    try {
      setMessage("");
      const response = await api.post("/assignments/assign-all", {
        fee_id: Number(selectedFeeId),
        performed_by: user?.user_id || null,
      });
      setMessage(
        `${response.data.message}. Assigned: ${response.data.assignedCount}, Skipped: ${response.data.skippedCount}`
      );
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign fee.");
    }
  };

  return (
    <PortalLayout title="Fee Assignment" navItems={adminNav}>
      <div className="card">
        <h3>Assign Fee to All Enrolled Students</h3>
        <div className="toolbar">
          <select value={selectedFeeId} onChange={(e) => setSelectedFeeId(e.target.value)}>
            <option value="">Select Fee</option>
            {fees
              .filter((fee) => String(fee.status || "").trim().toLowerCase() === "active")
              .map((fee) => (
                <option key={fee.fee_id} value={fee.fee_id}>
                  {fee.fee_name} - PHP {Number(fee.amount).toLocaleString()}
                </option>
              ))}
          </select>
          <span className="small-text" style={{ marginLeft: "1rem" }}>
            Only active fees are assignable.
          </span>
          <button className="btn" onClick={handleAssignAll}>
            Assign to All
          </button>
        </div>
        {message && <p className="small-text">{message}</p>}
      </div>

      <div className="card section-card">
        {loading && <p>Loading assignment summary...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Fee</th>
                <th>Assigned</th>
                <th>Paid</th>
                <th>Unpaid</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.fee_id}>
                  <td>{row.fee_name}</td>
                  <td>{row.total_assigned || 0}</td>
                  <td>{row.total_paid || 0}</td>
                  <td>{row.total_unpaid || 0}</td>
                </tr>
              ))}
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="small-text">
                    No summary data yet.
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

export default ModeratorAssignmentsPage;
