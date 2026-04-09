import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import { formatYearLevel, formatCourseAbbrev } from "../utils/displayFormat";
import { ALLOWED_COURSES } from "../utils/formValidation";
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

const YEAR_LEVELS = ["1", "2", "3", "4", "5"];

const ModeratorStudentsPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get("/students");
        setRows(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    let result = rows;

    // Apply search filter
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter((row) => {
        const name = `${row.first_name} ${row.last_name}`.toLowerCase();
        return name.includes(q) || String(row.student_number).toLowerCase().includes(q);
      });
    }

    // Apply course filter
    if (filterCourse) {
      result = result.filter((row) => row.course === filterCourse);
    }

    // Apply year level filter
    if (filterYear) {
      result = result.filter((row) => String(row.year_level) === filterYear);
    }

    return result;
  }, [rows, search, filterCourse, filterYear]);

  return (
    <PortalLayout title="Student Management" navItems={adminNav}>
      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by student number or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            {ALLOWED_COURSES.map((course) => (
              <option key={course} value={course}>
                {formatCourseAbbrev(course)}
              </option>
            ))}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>
                {formatYearLevel(year)}
              </option>
            ))}
          </select>
          <Link className="btn" to="/moderator/students/new">
            Add Student
          </Link>
        </div>
      </div>

      <div className="card section-card">
        {loading && <p>Loading students...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Student ID No.</th>
                <th>Name</th>
                <th>Course / Year</th>
                <th>Section</th>
                <th>Enrollment</th>
                <th>User Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.student_id}>
                  <td>{row.student_number}</td>
                  <td>{`${row.first_name} ${row.last_name}`}</td>
                  <td>{`${formatCourseAbbrev(row.course)} / ${formatYearLevel(row.year_level)}`}</td>
                  <td>{row.section || "-"}</td>
                  <td>{row.enrollment_status || "-"}</td>
                  <td>{row.status || "-"}</td>
                  <td>
                    <Link className="btn btn-secondary" to={`/moderator/students/${row.student_id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="small-text">
                    No students found.
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

export default ModeratorStudentsPage;
