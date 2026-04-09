import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
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

const ModeratorFeesPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/fees");
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load fees.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) => row.fee_name?.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <PortalLayout title="Fee Management" navItems={adminNav}>
      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search fee name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link className="btn" to="/moderator/fees/new">
            Create Fee
          </Link>
        </div>
      </div>

      <div className="card section-card">
        {loading && <p>Loading fees...</p>}
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
              {filtered.map((row) => (
                <tr key={row.fee_id}>
                  <td>{row.fee_name}</td>
                  <td>PHP {Number(row.amount).toLocaleString()}</td>
                  <td>{row.due_date ? new Date(row.due_date).toLocaleDateString() : "-"}</td>
                  <td>
                    <span className={`status ${row.status === "inactive" ? "status-unpaid" : "status-paid"}`}>
                      {row.status || "active"}
                    </span>
                  </td>
                  <td>
                    <Link className="btn btn-secondary" to={`/moderator/fees/${row.fee_id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="small-text">
                    No fees found.
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

export default ModeratorFeesPage;
