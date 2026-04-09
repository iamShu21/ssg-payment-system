import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  ALLOWED_COURSES,
  OFFICER_POSITIONS,
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
  first_name: "",
  middle_name: "",
  last_name: "",
  position: "",
  course: "",
  email: "",
  user_status: "active",
};

const getValidationErrors = (form) => {
  const errors = {};
  if (form.email && !isValidEmail(form.email)) {
    errors.email = getEmailErrorMessage(form.email);
  }
  return errors;
};

const ModeratorOfficerFormPage = () => {
  const { officer_id } = useParams();
  const isEdit = Boolean(officer_id);
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
        const response = await api.get(`/officers/${officer_id}`);
        const row = response.data;
        setForm({
          username: row.username || "",
          password: "",
          first_name: row.first_name || "",
          middle_name: row.middle_name || "",
          last_name: row.last_name || "",
          position: row.position || "",
          course: row.course || "",
          email: row.email || "",
          user_status: row.status || "active",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load officer.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isEdit, officer_id]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const validationErrors = getValidationErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors)[0]);
      setSaving(false);
      return;
    }

    try {
      const submissionData = {
        ...form,
        performed_by: user?.user_id || null,
      };

      if (isEdit) {
        delete submissionData.password;
        await api.put(`/officers/${officer_id}`, submissionData);
      } else {
        await api.post("/officers", submissionData);
      }

      navigate("/moderator/officers");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save officer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title={isEdit ? "Edit Officer" : "Add Officer"} navItems={adminNav}>
      <div className="card">
        {loading ? (
          <p>Loading officer...</p>
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

            <label>Position</label>
            <select
              value={form.position}
              onChange={(e) => setValue("position", e.target.value)}
              required
            >
              <option value="" disabled>Select position</option>
              {OFFICER_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>

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

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setValue("email", e.target.value)}
            />

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
              <Link className="btn btn-secondary" to="/moderator/officers">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
};

export default ModeratorOfficerFormPage;
