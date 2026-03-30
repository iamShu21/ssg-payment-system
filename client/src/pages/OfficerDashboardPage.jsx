import PortalLayout from "../components/PortalLayout";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import SimpleBarChart from "../components/SimpleBarChart";
import StatusBadge from "../components/StatusBadge";

const officerNav = [
  { to: "/officer/dashboard", label: "Dashboard" },
  { to: "/officer/payments", label: "Payments" },
  { to: "/officer/history", label: "Transaction History" },
];

const OfficerDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [recentRows, setRecentRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/payments/officer/summary");
        setSummary(response.data.summary);
        setRecentRows(response.data.recent_activity || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load officer dashboard.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const summaryChartData = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Paid", value: summary.total_paid_transactions || 0, color: "#48a111" },
      { label: "Unreviewed", value: summary.unreviewed_payments || 0, color: "#f2b50b" },
      { label: "Verified", value: summary.verified_payments || 0, color: "#2f5fa8" },
      { label: "Processed", value: summary.processed_payments || 0, color: "#25671e" },
    ];
  }, [summary]);

  const recentTransactionsData = useMemo(() => {
    return recentRows.slice(0, 6).map((row) => ({
      label: row.student_number || `Payment #${row.payment_id}`,
      value: Number(row.amount || 0),
      color: "#25671e",
    }));
  }, [recentRows]);

  const paymentStatusBreakdownData = useMemo(() => {
    const map = {};
    recentRows.forEach((row) => {
      const key = String(row.payment_status || "unknown").toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    const colorMap = {
      paid: "#48a111",
      pending: "#f2b50b",
      failed: "#c0392b",
      unknown: "#6a5d5d",
    };

    return Object.entries(map).map(([status, count]) => ({
      label: status,
      value: count,
      color: colorMap[status] || "#25671e",
    }));
  }, [recentRows]);

  return (
    <PortalLayout title="Officer Dashboard" navItems={officerNav}>
      {loading && <p className="page-message">Loading dashboard...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && summary && (
        <>
          <div className="cards-grid">
            <div className="summary-card">
              <h4>Total Paid Transactions</h4>
              <p>{summary.total_paid_transactions || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Unreviewed Payments</h4>
              <p>{summary.unreviewed_payments || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Verified Payments</h4>
              <p>{summary.verified_payments || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Processed Payments</h4>
              <p>{summary.processed_payments || 0}</p>
            </div>
          </div>

          <div className="card section-card">
            <h3>Quick Links</h3>
            <div className="button-row">
              <Link className="btn" to="/officer/payments">
                Open Payments List
              </Link>
              <Link className="btn btn-secondary" to="/officer/history">
                Open Transaction History
              </Link>
            </div>
          </div>

          <div className="charts-grid">
            <SimpleBarChart
              title="Paid vs Unreviewed vs Verified vs Processed"
              data={summaryChartData}
            />
            <SimpleBarChart
              title="Payment Status Breakdown (Recent)"
              data={paymentStatusBreakdownData}
            />
          </div>

          <SimpleBarChart
            title="Recent Transactions Overview"
            data={recentTransactionsData}
            valueFormatter={(value) => `PHP ${Number(value).toLocaleString()}`}
            emptyMessage="No recent transactions to chart."
          />

          <div className="card section-card">
            <h3>Recent Payment Activity</h3>
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Student</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Officer Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row) => (
                  <tr key={row.payment_id}>
                    <td>{row.payment_id}</td>
                    <td>
                      <div>{row.student_name}</div>
                      <div className="small-text">{row.student_number}</div>
                    </td>
                    <td>{row.fee_name}</td>
                    <td><StatusBadge value={row.payment_status} /></td>
                    <td><StatusBadge value={row.officer_status || "unreviewed"} /></td>
                    <td>PHP {Number(row.amount).toLocaleString()}</td>
                  </tr>
                ))}
                {recentRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="small-text">
                      No recent payment activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default OfficerDashboardPage;
