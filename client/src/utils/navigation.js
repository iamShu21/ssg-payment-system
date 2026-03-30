export const getRoleNav = (role) => {
  if (role === "student") {
    return [
      { to: "/student/dashboard", label: "Dashboard" },
      { to: "/student/fees", label: "Assigned Fees" },
      { to: "/student/payments", label: "Payment History" },
      { to: "/profile", label: "Profile" },
      { to: "/change-password", label: "Change Password" },
      { to: "/notifications", label: "Notifications" },
    ];
  }

  if (role === "ssg_officer") {
    return [
      { to: "/officer/dashboard", label: "Dashboard" },
      { to: "/officer/payments", label: "Payments" },
      { to: "/officer/history", label: "Transaction History" },
      { to: "/profile", label: "Profile" },
      { to: "/change-password", label: "Change Password" },
      { to: "/notifications", label: "Notifications" },
    ];
  }

  return [
    { to: "/moderator/dashboard", label: "Dashboard" },
    { to: "/moderator/students", label: "Students" },
    { to: "/moderator/fees", label: "Fees" },
    { to: "/moderator/assignments", label: "Assignments" },
    { to: "/moderator/reports", label: "Reports" },
    { to: "/moderator/audit-logs", label: "Audit Logs" },
    { to: "/profile", label: "Profile" },
    { to: "/change-password", label: "Change Password" },
    { to: "/notifications", label: "Notifications" },
  ];
};
