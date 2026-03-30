import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const PaymentCancelPage = () => {
  return (
    <PortalLayout title="Payment Cancelled" navItems={studentNav}>
      <div className="card narrow">
        <h2>Payment Cancelled</h2>
        <p>The payment was cancelled. You can try again anytime.</p>
        <Link className="btn" to="/student/fees">
          Back to Assigned Fees
        </Link>
      </div>
    </PortalLayout>
  );
};

export default PaymentCancelPage;
