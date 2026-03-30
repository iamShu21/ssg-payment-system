import { Link, useNavigate } from "react-router-dom";

const Layout = ({ title, children }) => {
  const navigate = useNavigate();
  const studentId = localStorage.getItem("student_id");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("student_id");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="container">
      <header className="header">
        <h2>{title}</h2>
        <div className="header-right">
          <span className="small-text">Student ID: {studentId || "-"}</span>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav">
        <Link to="/student/fees">Assigned Fees</Link>
        <Link to="/student/payments">Payment History</Link>
      </nav>

      <main>{children}</main>
    </div>
  );
};

export default Layout;
