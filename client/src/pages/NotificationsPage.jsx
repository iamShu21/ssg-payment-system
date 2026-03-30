import { useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getRoleNav } from "../utils/navigation";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/notifications/${user.user_id}`);
      setRows(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_id) load();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update notification.");
    }
  };

  return (
    <PortalLayout title="Notifications" navItems={getRoleNav(user?.role)}>
      <div className="card">
        {loading && <p className="page-message">Loading notifications...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="notice-list">
            {rows.map((row) => (
              <div key={row.notification_id} className={`notice-item ${row.is_read ? "read" : "unread"}`}>
                <div className="notice-title-row">
                  <h4>{row.title}</h4>
                  <span className={`status ${row.is_read ? "status-read" : "status-unread"}`}>
                    {row.is_read ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="notice-message">{row.message}</p>
                <div className="notice-meta">
                  <span className="small-text">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                  </span>
                  {!row.is_read && (
                    <button className="btn btn-secondary" onClick={() => markAsRead(row.notification_id)}>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="notice-empty">
                <p>No notifications yet.</p>
                <p className="small-text">You will see updates about fees and payments here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default NotificationsPage;
