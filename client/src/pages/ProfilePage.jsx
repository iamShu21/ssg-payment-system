import { useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { useAuth } from "../context/AuthContext";
import { formatYearLevel } from "../utils/displayFormat";
import api from "../services/api";
import { getRoleNav } from "../utils/navigation";

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.get(`/auth/profile/${user.user_id}`);
        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    if (user?.user_id) run();
  }, [user]);

  return (
    <PortalLayout title="Profile" navItems={getRoleNav(user?.role)}>
      <div className="card">
        {loading && <p>Loading profile...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && profile && (
          <div className="profile-grid">
            <div><strong>Username:</strong> {profile.username}</div>
            <div><strong>Role:</strong> {profile.role}</div>
            <div><strong>User Status:</strong> {profile.status}</div>
            <div><strong>Student Number:</strong> {profile.student_number || "-"}</div>
            <div><strong>Name:</strong> {[profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "-"}</div>
            <div><strong>Email:</strong> {profile.email || "-"}</div>
            <div><strong>Course:</strong> {profile.course || "-"}</div>
            <div><strong>Year/Section:</strong> {formatYearLevel(profile.year_level) || "-"} {profile.section ? `/ ${profile.section}` : ""}</div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default ProfilePage;
