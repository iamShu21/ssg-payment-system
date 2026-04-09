import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  ALLOWED_COURSES,
  isValidEmail,
  getEmailErrorMessage,
} from "../utils/formValidation";

const adminNav = [
  { to: "/moderator/dashboard", label: "Dashboard" },
  { to: "/moderator/students", label: "Students" },
  { to: "/moderator/officers", label: "Officers" },
  { to: "/moderator/fees", label: "Fees" },
  { to: "/moderator/assignments", label: "Assignments" },
  { to: "/moderator/reports", label: "Reports" },
  { to: "/moderator/audit-logs", label: "Audit Logs" },
];

const blank = {
  username: "",
  password: "",
  student_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  course: "",
  year_level: "",
  section: "",
  email: "",
  enrollment_status: "enrolled",
  user_status: "active",
};

const ModeratorStudentFormPage = () => {
  const { student_id } = useParams();
  const isEdit = Boolean(student_id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    const run = async () => {
      try {
        const response = await api.get(`/students/${student_id}`);
        const row = response.data;
        setForm({
          username: row.username || "",
          password: "",
          student_number: row.student_number || "",
          first_name: row.first_name || "",
          middle_name: row.middle_name || "",
          last_name: row.last_name || "",
          course: row.course || "",
          year_level: row.year_level ? String(row.year_level) : "",
          section: row.section || "",
          email: row.email || "",
          enrollment_status: row.enrollment_status || "enrolled",
          user_status: row.status || "active",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load student.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isEdit, student_id]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (form.email && !isValidEmail(form.email)) {
      setError(getEmailErrorMessage(form.email));
      setSaving(false);
      return;
    }

    try {
      const submissionData = {
        ...form,
        year_level: Number(form.year_level),
        performed_by: user?.user_id || null,
      };
      if (isEdit) {
        await api.put(`/students/${student_id}`, submissionData);
      } else {
        await api.post("/students", submissionData);
      }
      navigate("/moderator/students");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title={isEdit ? "Edit Student" : "Add Student"} navItems={adminNav}>
      <div className="card">
        {loading ? (
          <p>Loading student...</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>Username</label>
            <input
              placeholder="Enter username"
              value={form.username}
              onChange={(e) => setValue("username", e.target.value)}
              required
              disabled={isEdit}
            />

            {!isEdit && (
              <>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setValue("password", e.target.value)}
                  required
                />
              </>
            )}

            <label>Student ID Number</label>
            <input
              placeholder="Enter student number"
              value={form.student_number}
              onChange={(e) => setValue("student_number", e.target.value)}
              required
            />

            <label>First Name</label>
            <input
              placeholder="Enter first name"
              value={form.first_name}
              onChange={(e) => setValue("first_name", e.target.value)}
              required
            />

            <label>Middle Name</label>
            <input
              placeholder="Enter middle name"
              value={form.middle_name}
              onChange={(e) => setValue("middle_name", e.target.value)}
            />

            <label>Last Name</label>
            <input
              placeholder="Enter last name"
              value={form.last_name}
              onChange={(e) => setValue("last_name", e.target.value)}
              required
            />

            <label>Course</label>
            <select
              value={form.course}
              onChange={(e) => setValue("course", e.target.value)}
              required
            >
              <option value="" disabled>Select course</option>
              {ALLOWED_COURSES.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>

            <label>Year Level</label>
            <select
              value={form.year_level}
              onChange={(e) => setValue("year_level", e.target.value)}
              required
            >
              <option value="" disabled>Select year level</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
              <option value="5">5th Year</option>
            </select>

            <label>Section</label>
            <input
              placeholder="Enter section"
              value={form.section}
              onChange={(e) => setValue("section", e.target.value)}
            />

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setValue("email", e.target.value)}
            />

            <label>Enrollment Status</label>
            <select
              value={form.enrollment_status}
              onChange={(e) => setValue("enrollment_status", e.target.value)}
            >
              <option value="enrolled">Enrolled</option>
              <option value="inactive">Inactive</option>
            </select>

            <label>User Status</label>
            <select
              value={form.user_status}
              onChange={(e) => setValue("user_status", e.target.value)}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {error && <p className="error">{error}</p>}

            <div className="button-row">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <Link className="btn btn-secondary" to="/moderator/students">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
};

export default ModeratorStudentFormPage;
