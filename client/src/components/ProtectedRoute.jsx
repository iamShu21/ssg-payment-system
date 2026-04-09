import { useLayoutEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isLoading, isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const accountInactive =
    user?.status != null && String(user.status).trim().toLowerCase() !== "active";

  useLayoutEffect(() => {
    if (isLoading || !isAuthenticated || !accountInactive) return;
    logout();
    navigate("/", { replace: true, state: { authError: "Account is inactive" } });
  }, [isLoading, isAuthenticated, accountInactive, logout, navigate]);

  if (isLoading) {
    return <div className="page-message">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (accountInactive) {
    return (
      <div className="page-message" role="status">
        Ending session…
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

export default ProtectedRoute;
