import { useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import SimpleBarChart from "../components/SimpleBarChart";
import { formatCourseAbbrev, formatYearLevel } from "../utils/displayFormat";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const adminNav = [
  { to: "/moderator/dashboard", label: "Dashboard" },
  { to: "/moderator/students", label: "Students" },
  { to: "/moderator/officers", label: "Officers" },
  { to: "/moderator/fees", label: "Fees" },
  { to: "/moderator/assignments", label: "Assignments" },
  { to: "/moderator/reports", label: "Reports" },
  { to: "/moderator/audit-logs", label: "Audit Logs" },
];

const ModeratorReportsPage = () => {
  const [overview, setOverview] = useState(null);
  const [perFee, setPerFee] = useState([]);
  const [dailyCollection, setDailyCollection] = useState([]);
  const [monthlyCollection, setMonthlyCollection] = useState([]);
  const [unpaidStudents, setUnpaidStudents] = useState([]);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        // Load essential report data
        const [overviewResponse, perFeeResponse] = await Promise.all([
          api.get("/admin/reports/overview"),
          api.get("/admin/reports/per-fee"),
        ]);
        setOverview(overviewResponse.data);
        setPerFee(perFeeResponse.data);

        // Load optional chart data separately (don't fail if these endpoints aren't ready)
        try {
          const dailyResponse = await api.get("/admin/reports/daily-collection");
          setDailyCollection(dailyResponse.data || []);
        } catch (err) {
          console.warn("Daily collection data not available:", err);
          setDailyCollection([]);
        }

        try {
          const monthlyResponse = await api.get("/admin/reports/monthly-collection");
          setMonthlyCollection(monthlyResponse.data || []);
        } catch (err) {
          console.warn("Monthly collection data not available:", err);
          setMonthlyCollection([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Load unpaid students when fee is selected
  useEffect(() => {
    if (!selectedFeeId) {
      setUnpaidStudents([]);
      return;
    }

    const run = async () => {
      try {
        const response = await api.get(`/admin/reports/unpaid-students/${selectedFeeId}`);
        setUnpaidStudents(response.data);
      } catch (err) {
        console.error("Failed to load unpaid students:", err);
        setUnpaidStudents([]);
      }
    };
    run();
  }, [selectedFeeId]);

  const getTodayText = () => {
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  const toCurrency = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

  const exportCsv = () => {
    const lines = [];
    lines.push("SSG Payment System Reports");
    lines.push(`Generated At,${getTodayText()}`);
    lines.push("");
    lines.push("Summary Metrics");
    lines.push(`Total Collections,${Number(overview?.total_collections || 0)}`);
    lines.push(`Paid Assignments,${Number(overview?.paid_vs_unpaid?.total_paid_assignments || 0)}`);
    lines.push(`Unpaid Assignments,${Number(overview?.paid_vs_unpaid?.total_unpaid_assignments || 0)}`);
    lines.push("");
    lines.push("Per-Fee Collection Summary");
    lines.push("Fee Name,Assigned,Paid,Unpaid,Total Collected");

    perFee.forEach((row) => {
      const csvRow = [
        row.fee_name || "",
        Number(row.total_assigned || 0),
        Number(row.total_paid_count || 0),
        Number(row.total_unpaid_count || 0),
        Number(row.total_collected || 0),
      ]
        .map((item) => `"${String(item).replace(/"/g, '""')}"`)
        .join(",");
      lines.push(csvRow);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ssg-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const generatedAt = getTodayText();

    doc.setFontSize(16);
    doc.text("SSG Payment System Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated At: ${generatedAt}`, 14, 25);

    doc.setFontSize(12);
    doc.text("Summary Metrics", 14, 35);
    doc.setFontSize(10);
    doc.text(`Total Collections: ${toCurrency(overview?.total_collections || 0)}`, 14, 42);
    doc.text(
      `Paid Assignments: ${Number(overview?.paid_vs_unpaid?.total_paid_assignments || 0)}`,
      14,
      48
    );
    doc.text(
      `Unpaid Assignments: ${Number(overview?.paid_vs_unpaid?.total_unpaid_assignments || 0)}`,
      14,
      54
    );

    autoTable(doc, {
      startY: 62,
      head: [["Fee Name", "Assigned", "Paid", "Unpaid", "Total Collected"]],
      body: perFee.map((row) => [
        row.fee_name || "-",
        Number(row.total_assigned || 0),
        Number(row.total_paid_count || 0),
        Number(row.total_unpaid_count || 0),
        toCurrency(row.total_collected || 0),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 103, 30] },
    });

    doc.save(`ssg-reports-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <PortalLayout title="Reports" navItems={adminNav}>
      {loading && <p className="page-message">Loading reports...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && overview && (
        <>
          <div className="card section-card">
            <h3>Export Reports</h3>
            <p className="small-text">Download current summary and table data.</p>
            <div className="button-row">
              <button className="btn" type="button" onClick={exportCsv}>
                Export CSV
              </button>
              <button className="btn btn-secondary" type="button" onClick={exportPdf}>
                Export PDF
              </button>
            </div>
          </div>

          <div className="cards-grid">
            <div className="summary-card">
              <h4>Total Collections</h4>
              <p>PHP {Number(overview.total_collections || 0).toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Paid Assignments</h4>
              <p>{overview.paid_vs_unpaid?.total_paid_assignments || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Unpaid Assignments</h4>
              <p>{overview.paid_vs_unpaid?.total_unpaid_assignments || 0}</p>
            </div>
          </div>

          <SimpleBarChart
            title="Daily Collection Report (Last 30 Days)"
            data={dailyCollection.map((item, index) => ({
              id: index,
              label: new Date(item.payment_date).toLocaleDateString("en-PH"),
              value: Number(item.total_amount || 0),
            }))}
            valueFormatter={(val) => `PHP ${Number(val).toLocaleString()}`}
            emptyMessage="No daily collection data available."
          />

          <SimpleBarChart
            title="Monthly Collection Report (Last 12 Months)"
            data={monthlyCollection.map((item, index) => ({
              id: index,
              label: new Date(item.month || new Date()).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
              }),
              value: Number(item.total_amount || 0),
            }))}
            valueFormatter={(val) => `PHP ${Number(val).toLocaleString()}`}
            emptyMessage="No monthly collection data available."
          />

          <div className="card section-card">
            <h3>Unpaid Students per Fee</h3>
            <div className="form-grid" style={{ gridTemplateColumns: "auto" }}>
              <label>Select Fee</label>
              <select value={selectedFeeId} onChange={(e) => setSelectedFeeId(e.target.value)}>
                <option value="">Choose a fee...</option>
                {perFee.map((fee) => (
                  <option key={fee.fee_id} value={fee.fee_id}>
                    {fee.fee_name} ({fee.total_unpaid_count} unpaid)
                  </option>
                ))}
              </select>
            </div>

            {selectedFeeId && (
              <table style={{ marginTop: "20px" }}>
                <thead>
                  <tr>
                    <th>Student #</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Section</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidStudents.length > 0 ? (
                    unpaidStudents.map((student) => (
                      <tr key={student.student_fee_id}>
                        <td>{student.student_number}</td>
                        <td>{`${student.first_name} ${student.middle_name ? `${student.middle_name} ` : ""}${student.last_name}`}</td>
                        <td>{formatCourseAbbrev(student.course)}</td>
                        <td>{formatYearLevel(student.year_level)} Year</td>
                        <td>{student.section || "-"}</td>
                        <td>
                          <span className="status status-unpaid">{student.assignment_status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="small-text">
                        No unpaid students for this fee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="card section-card">
            <h3>Per-Fee Collection Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Fee Name</th>
                  <th>Assigned</th>
                  <th>Paid</th>
                  <th>Unpaid</th>
                  <th>Total Collected</th>
                </tr>
              </thead>
              <tbody>
                {perFee.map((row) => (
                  <tr key={row.fee_id}>
                    <td>{row.fee_name}</td>
                    <td>{row.total_assigned || 0}</td>
                    <td>{row.total_paid_count || 0}</td>
                    <td>{row.total_unpaid_count || 0}</td>
                    <td>PHP {Number(row.total_collected || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {perFee.length === 0 && (
                  <tr>
                    <td colSpan={5} className="small-text">
                      No report data.
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

export default ModeratorReportsPage;
