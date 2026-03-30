import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import LoginPage from "./pages/LoginPage";
import ModeratorDashboardPage from "./pages/ModeratorDashboardPage";
import ModeratorAssignmentsPage from "./pages/ModeratorAssignmentsPage";
import ModeratorAuditLogsPage from "./pages/ModeratorAuditLogsPage";
import ModeratorFeeFormPage from "./pages/ModeratorFeeFormPage";
import ModeratorFeesPage from "./pages/ModeratorFeesPage";
import ModeratorReportsPage from "./pages/ModeratorReportsPage";
import ModeratorStudentFormPage from "./pages/ModeratorStudentFormPage";
import ModeratorStudentsPage from "./pages/ModeratorStudentsPage";
import OfficerDashboardPage from "./pages/OfficerDashboardPage";
import OfficerPaymentsPage from "./pages/OfficerPaymentsPage";
import OfficerReceiptPage from "./pages/OfficerReceiptPage";
import OfficerTransactionHistoryPage from "./pages/OfficerTransactionHistoryPage";
import NotificationsPage from "./pages/NotificationsPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProfilePage from "./pages/ProfilePage";
import StudentAssignedFeesPage from "./pages/StudentAssignedFeesPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import StudentPaymentHistoryPage from "./pages/StudentPaymentHistoryPage";
import StudentReceiptPage from "./pages/StudentReceiptPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["student", "ssg_officer", "admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowedRoles={["student", "ssg_officer", "admin"]}>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["student", "ssg_officer", "admin"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/fees"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentAssignedFeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/payments"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentPaymentHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/receipt/:payment_id"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/cancel"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PaymentCancelPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/officer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ssg_officer"]}>
              <OfficerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/payments"
          element={
            <ProtectedRoute allowedRoles={["ssg_officer"]}>
              <OfficerPaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/history"
          element={
            <ProtectedRoute allowedRoles={["ssg_officer"]}>
              <OfficerTransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/receipt/:payment_id"
          element={
            <ProtectedRoute allowedRoles={["ssg_officer"]}>
              <OfficerReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/students"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorStudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/students/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorStudentFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/students/:student_id/edit"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorStudentFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/fees"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorFeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/fees/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorFeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/fees/:fee_id/edit"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorFeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/assignments"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModeratorAuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
