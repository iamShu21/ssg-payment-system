import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
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

const blank = {
  fee_name: "",
  description: "",
  amount: "",
  due_date: "",
  status: "active",
};

const ModeratorFeeFormPage = () => {
  const { fee_id } = useParams();
  const isEdit = Boolean(fee_id);
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
        const response = await api.get(`/fees/${fee_id}`);
        const row = response.data;
        setForm({
          fee_name: row.fee_name || "",
          description: row.description || "",
          amount: row.amount || "",
          due_date: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : "",
          status: row.status || "active",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load fee.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isEdit, fee_id]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await api.put(`/fees/${fee_id}`, {
          ...form,
          performed_by: user?.user_id || null,
        });
      } else {
        await api.post("/fees", {
          ...form,
          performed_by: user?.user_id || null,
        });
      }
      navigate("/moderator/fees");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save fee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title={isEdit ? "Edit Fee" : "Create Fee"} navItems={adminNav}>
      <div className="card">
        {loading ? (
          <p>Loading fee...</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>Fee Name</label>
            <input
              placeholder="Enter fee name"
              value={form.fee_name}
              onChange={(e) => setValue("fee_name", e.target.value)}
              required
            />

            <label>Description</label>
            <input
              placeholder="Enter description"
              value={form.description}
              onChange={(e) => setValue("description", e.target.value)}
            />

            <label>Amount</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) => setValue("amount", e.target.value)}
              required
            />

            <label>Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setValue("due_date", e.target.value)}
            />

            <label>Status</label>
            <select value={form.status} onChange={(e) => setValue("status", e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>

            {error && <p className="error">{error}</p>}

            <div className="button-row">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <Link className="btn btn-secondary" to="/moderator/fees">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
};

export default ModeratorFeeFormPage;
