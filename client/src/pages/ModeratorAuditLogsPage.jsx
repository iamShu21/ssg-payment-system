import { useEffect, useMemo, useState } from "react";
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

const ModeratorAuditLogsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/admin/audit-logs");
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const uniqueActions = useMemo(() => {
    return [...new Set(rows.map((row) => row.action).filter(Boolean))].sort();
  }, [rows]);

  const uniqueTargetTypes = useMemo(() => {
    return [...new Set(rows.map((row) => row.target_type).filter(Boolean))].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const userText = (row.username || `user:${row.user_id}` || "").toLowerCase();
      const matchUser = searchUser.trim()
        ? userText.includes(searchUser.trim().toLowerCase())
        : true;
      const matchAction = actionFilter ? row.action === actionFilter : true;
      const matchTargetType = targetTypeFilter ? row.target_type === targetTypeFilter : true;
      const matchDate = dateFilter
        ? row.created_at && new Date(row.created_at).toISOString().slice(0, 10) === dateFilter
        : true;
      return matchUser && matchAction && matchTargetType && matchDate;
    });
  }, [rows, searchUser, actionFilter, targetTypeFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [searchUser, actionFilter, targetTypeFilter, dateFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <PortalLayout title="Audit Logs" navItems={adminNav}>
      <div className="card">
        {loading && <p className="page-message">Loading audit logs...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="audit-toolbar">
              <div>
                <label>User</label>
                <input
                  type="text"
                  placeholder="Search username or user ID"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>
              <div>
                <label>Action</label>
                <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                  <option value="">All actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Target Type</label>
                <select value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)}>
                  <option value="">All target types</option>
                  {uniqueTargetTypes.map((targetType) => (
                    <option key={targetType} value={targetType}>
                      {targetType}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="audit-meta">
              <p className="small-text">
                Showing {pagedRows.length} of {filteredRows.length} filtered logs
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchUser("");
                  setActionFilter("");
                  setTargetTypeFilter("");
                  setDateFilter("");
                }}
                type="button"
              >
                Reset Filters
              </button>
            </div>

            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target Type</th>
                    <th>Target ID</th>
                    <th>Description</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.audit_id}>
                      <td>{row.audit_id}</td>
                      <td>
                        <div>{row.username || `user:${row.user_id}`}</div>
                        <div className="small-text">ID: {row.user_id || "-"}</div>
                      </td>
                      <td><span className="tag-chip">{row.action}</span></td>
                      <td><span className="tag-chip muted">{row.target_type}</span></td>
                      <td>{row.target_id || "-"}</td>
                      <td className="audit-description">{row.description || "-"}</td>
                      <td>{formatDateTime(row.created_at)}</td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="audit-empty">
                          <p>No audit logs match the current filters.</p>
                          <p className="small-text">Try clearing one or more filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 0 && (
              <div className="audit-pagination">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="small-text">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default ModeratorAuditLogsPage;
