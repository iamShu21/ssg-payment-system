import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";

const officerNav = [
  { to: "/officer/dashboard", label: "Dashboard" },
  { to: "/officer/payments", label: "Payments" },
  { to: "/officer/history", label: "Transaction History" },
];

const OfficerTransactionHistoryPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/payments/officer/history");
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load transaction history.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <PortalLayout title="Officer Transaction History" navItems={officerNav}>
      <div className="card">
        {loading && <p className="page-message">Loading transaction history...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Processing ID</th>
                <th>Payment ID</th>
                <th>Student</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Processed At</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.processing_id}>
                  <td>{row.processing_id}</td>
                  <td>{row.payment_id}</td>
                  <td>
                    <div>{row.student_name}</div>
                    <div className="small-text">{row.student_number}</div>
                  </td>
                  <td>{row.fee_name}</td>
                  <td><StatusBadge value={row.processing_status} /></td>
                  <td>{row.remarks || "-"}</td>
                  <td>{row.processed_at ? new Date(row.processed_at).toLocaleString() : "-"}</td>
                  <td>
                    <Link className="btn btn-dark" to={`/officer/receipt/${row.payment_id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="small-text">
                    No verified/processed records yet.
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

export default OfficerTransactionHistoryPage;
