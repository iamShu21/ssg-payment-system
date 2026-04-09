import PortalLayout from "../components/PortalLayout";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import SimpleBarChart from "../components/SimpleBarChart";

const moderatorNav = [
  { to: "/moderator/dashboard", label: "Dashboard" },
  { to: "/moderator/students", label: "Students" },
  { to: "/moderator/officers", label: "Officers" },
  { to: "/moderator/fees", label: "Fees" },
  { to: "/moderator/assignments", label: "Assignments" },
  { to: "/moderator/reports", label: "Reports" },
  { to: "/moderator/audit-logs", label: "Audit Logs" },
];

const ModeratorDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [perFeeRows, setPerFeeRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const [summaryResponse, overviewResponse, perFeeResponse] = await Promise.all([
          api.get("/admin/dashboard-summary"),
          api.get("/admin/reports/overview"),
          api.get("/admin/reports/per-fee"),
        ]);
        setSummary(summaryResponse.data);
        setOverview(overviewResponse.data);
        setPerFeeRows(perFeeResponse.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const collectionsOverviewData = useMemo(() => {
    if (!summary) return [];
    const remaining = Math.max(
      Number(summary.total_assignments || 0) - Number(overview?.paid_vs_unpaid?.total_paid_assignments || 0),
      0
    );
    return [
      { label: "Collected Assignments", value: overview?.paid_vs_unpaid?.total_paid_assignments || 0, color: "#48a111" },
      { label: "Remaining Assignments", value: remaining, color: "#f2b50b" },
    ];
  }, [summary, overview]);

  const paidVsUnpaidData = useMemo(() => {
    const paid = Number(overview?.paid_vs_unpaid?.total_paid_assignments || 0);
    const unpaid = Number(overview?.paid_vs_unpaid?.total_unpaid_assignments || 0);
    return [
      { label: "Paid Assignments", value: paid, color: "#48a111" },
      { label: "Unpaid Assignments", value: unpaid, color: "#c0392b" },
    ];
  }, [overview]);

  const perFeeCollectionData = useMemo(() => {
    return [...perFeeRows]
      .sort((a, b) => Number(b.total_collected || 0) - Number(a.total_collected || 0))
      .slice(0, 6)
      .map((row) => ({
        label: row.fee_name,
        value: Number(row.total_collected || 0),
        color: "#25671e",
      }));
  }, [perFeeRows]);

  const activitySummaryData = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Students", value: Number(summary.total_students || 0), color: "#2f5fa8" },
      { label: "Active Fees", value: Number(summary.active_fees || 0), color: "#f2b50b" },
      { label: "Assignments", value: Number(summary.total_assignments || 0), color: "#48a111" },
    ];
  }, [summary]);

  return (
    <PortalLayout title="Dashboard" navItems={moderatorNav}>
      {loading && <p className="page-message">Loading dashboard...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && summary && (
        <>
          <div className="cards-grid">
            <div className="summary-card">
              <h4>Total Students</h4>
              <p>{summary.total_students || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Active Fees</h4>
              <p>{summary.active_fees || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Total Assignments</h4>
              <p>{summary.total_assignments || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Total Collections</h4>
              <p>PHP {Number(summary.total_collections || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="card section-card">
            <h3>Quick Links</h3>
            <div className="button-row">
              <Link className="btn" to="/moderator/students">
                Students
              </Link>
              <Link className="btn btn-secondary" to="/moderator/fees">
                Fees
              </Link>
              <Link className="btn btn-dark" to="/moderator/assignments">
                Assignments
              </Link>
              <Link className="btn" to="/moderator/reports">
                Reports
              </Link>
            </div>
          </div>

          <div className="charts-grid">
            <SimpleBarChart
              title="Total Collections Overview"
              data={collectionsOverviewData}
            />
            <SimpleBarChart
              title="Paid vs Unpaid Assignments"
              data={paidVsUnpaidData}
            />
          </div>

          <div className="charts-grid">
            <SimpleBarChart
              title="Per-Fee Collection Summary (Top 6)"
              data={perFeeCollectionData}
              valueFormatter={(value) => `PHP ${Number(value).toLocaleString()}`}
              emptyMessage="No per-fee collection data available."
            />
            <SimpleBarChart
              title="Student/Fee Activity Summary"
              data={activitySummaryData}
            />
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default ModeratorDashboardPage;
