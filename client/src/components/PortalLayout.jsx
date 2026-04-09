import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  formatRoleLabel,
  getPortalSubtitle,
  getWelcomeDisplayName,
} from "../utils/displayFormat";

const PortalLayout = ({ title, navItems, children }) => {
  const { user, student, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const unreadLabel = useMemo(() => {
    if (!unreadCount) return "";
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    const loadUnread = async () => {
      if (!user?.user_id) return;
      try {
        const response = await api.get(`/notifications/${user.user_id}`);
        const unread = (response.data || []).filter((item) => !item.is_read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    };
    loadUnread();
  }, [user?.user_id, location.pathname]);

  return (
    <div className="portal">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h3 className="sidebar-title">
            <span className="sidebar-brand-line">NDMU Supreme</span>
            <span className="sidebar-brand-line">Student Government</span>
          </h3>
          <p className="sidebar-portal-subtitle">{getPortalSubtitle(user?.role)}</p>
        </div>
        <div className="sidebar-meta">
          <span className="role-pill">{formatRoleLabel(user?.role)}</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? "active" : ""}
            >
              <span>{item.label}</span>
              {item.to === "/notifications" && unreadCount > 0 && (
                <span className="nav-badge">{unreadLabel}</span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar-heading">
            <h2 className="page-heading">{title}</h2>
            <p className="welcome-line">
              Welcome, {getWelcomeDisplayName({ user, student })}
            </p>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="btn btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
};

export default PortalLayout;
