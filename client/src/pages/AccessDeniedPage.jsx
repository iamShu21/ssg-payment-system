import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const AccessDeniedPage = () => {
  const { user, getHomePathByRole } = useAuth();
  const homePath = user?.role ? getHomePathByRole(user.role) : "/";

  return (
    <div className="relative container narrow">
      <div className="mb-4 flex justify-end">
        <ThemeToggle />
      </div>
      <div className="card">
        <h2>Access Denied</h2>
        <p>You do not have permission to open this page.</p>
        <div className="button-row">
          <Link className="btn" to="/">
            Back to Login
          </Link>
          <Link className="btn btn-secondary" to={homePath}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
