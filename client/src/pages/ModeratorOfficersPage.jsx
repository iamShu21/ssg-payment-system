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

const ModeratorOfficersPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/officers");
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load officers.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = `${row.first_name} ${row.last_name}`.toLowerCase();
      return (
        row.username?.toLowerCase().includes(q) ||
        name.includes(q) ||
        row.position?.toLowerCase().includes(q) ||
        row.course?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <PortalLayout title="Officer Management" navItems={adminNav}>
      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by username, name, position, or course"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link className="btn" to="/moderator/officers/new">
            Add Officer
          </Link>
        </div>
      </div>

      <div className="card section-card">
        {loading && <p>Loading officers...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Position</th>
                <th>Course</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.officer_id}>
                  <td>{row.username}</td>
                  <td>{`${row.first_name} ${row.middle_name ? `${row.middle_name} ` : ""}${row.last_name}`}</td>
                  <td>{row.position || "-"}</td>
                  <td>{row.course || "-"}</td>
                  <td>{row.email || "-"}</td>
                  <td>{row.status || "-"}</td>
                  <td>
                    <Link className="btn btn-secondary" to={`/moderator/officers/${row.officer_id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="small-text">
                    No officers found.
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

export default ModeratorOfficersPage;
