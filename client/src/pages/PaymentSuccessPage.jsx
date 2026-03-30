import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const PaymentSuccessPage = () => {
  return (
    <PortalLayout title="Payment Success" navItems={studentNav}>
      <div className="card narrow">
        <h2>Payment Successful</h2>
        <p>Your payment has been submitted. Webhook will update your status shortly.</p>
        <div className="button-row">
          <Link className="btn" to="/student/fees">
            Back to Assigned Fees
          </Link>
          <Link className="btn btn-secondary" to="/student/payments">
            View Payment History
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
};

export default PaymentSuccessPage;
