import { useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const adminNav = [
  { to: "/moderator/dashboard", label: "Dashboard" },
  { to: "/moderator/students", label: "Students" },
  { to: "/moderator/fees", label: "Fees" },
  { to: "/moderator/assignments", label: "Assignments" },
  { to: "/moderator/reports", label: "Reports" },
  { to: "/moderator/audit-logs", label: "Audit Logs" },
];

const ModeratorReportsPage = () => {
  const [overview, setOverview] = useState(null);
  const [perFee, setPerFee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const [overviewResponse, perFeeResponse] = await Promise.all([
          api.get("/admin/reports/overview"),
          api.get("/admin/reports/per-fee"),
        ]);
        setOverview(overviewResponse.data);
        setPerFee(perFeeResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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
