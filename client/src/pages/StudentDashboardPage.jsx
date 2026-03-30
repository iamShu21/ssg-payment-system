import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../components/PortalLayout";
import SimpleBarChart from "../components/SimpleBarChart";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/fees", label: "Assigned Fees" },
  { to: "/student/payments", label: "Payment History" },
];

const StudentDashboardPage = () => {
  const { student } = useAuth();
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const [feesResponse, historyResponse] = await Promise.all([
          api.get(`/student-fees/${student.student_id}`),
          api.get(`/payments/history/${student.student_id}`),
        ]);
        setFees(feesResponse.data);
        setPayments(historyResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    if (student?.student_id) run();
  }, [student]);

  const summary = useMemo(() => {
    const totalAssigned = fees.length;
    const totalPaid = fees.filter((fee) => fee.assignment_status === "paid").length;
    const totalUnpaid = totalAssigned - totalPaid;
    const totalAmountDue = fees
      .filter((fee) => fee.assignment_status !== "paid")
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    return { totalAssigned, totalPaid, totalUnpaid, totalAmountDue };
  }, [fees]);

  const feeStatusChartData = useMemo(() => {
    const paidCount = fees.filter((fee) => fee.assignment_status === "paid").length;
    const unpaidCount = fees.filter((fee) => fee.assignment_status !== "paid").length;
    return [
      { label: "Paid Fees", value: paidCount, color: "#48a111" },
      { label: "Unpaid Fees", value: unpaidCount, color: "#f2b50b" },
    ];
  }, [fees]);

  const paidUnpaidAmountData = useMemo(() => {
    const paidAmount = fees
      .filter((fee) => fee.assignment_status === "paid")
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    const unpaidAmount = fees
      .filter((fee) => fee.assignment_status !== "paid")
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    return [
      { label: "Paid Amount", value: paidAmount, color: "#48a111" },
      { label: "Unpaid Amount", value: unpaidAmount, color: "#f2b50b" },
    ];
  }, [fees]);

  const recentSummaryChartData = useMemo(() => {
    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0))
      .slice(0, 5);

    return recentPayments.map((item) => ({
      label: item.fee_name || `Payment #${item.payment_id}`,
      value: Number(item.amount || 0),
      color: "#25671e",
    }));
  }, [payments]);

  return (
    <PortalLayout title="Student Dashboard" navItems={studentNav}>
      {loading && <p className="page-message">Loading dashboard...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="cards-grid">
            <div className="summary-card">
              <h4>Total Assigned</h4>
              <p>{summary.totalAssigned}</p>
            </div>
            <div className="summary-card">
              <h4>Total Unpaid</h4>
              <p>{summary.totalUnpaid}</p>
            </div>
            <div className="summary-card">
              <h4>Total Paid</h4>
              <p>{summary.totalPaid}</p>
            </div>
            <div className="summary-card">
              <h4>Total Amount Due</h4>
              <p>PHP {summary.totalAmountDue.toLocaleString()}</p>
            </div>
          </div>

          <div className="card section-card">
            <h3>Quick Links</h3>
            <div className="button-row">
              <Link className="btn" to="/student/fees">
                Go to Assigned Fees
              </Link>
              <Link className="btn btn-secondary" to="/student/payments">
                Go to Payment History
              </Link>
            </div>
          </div>

          <div className="charts-grid">
            <SimpleBarChart
              title="Fee Status Summary"
              data={feeStatusChartData}
              valueFormatter={(value) => `${value}`}
            />
            <SimpleBarChart
              title="Paid vs Unpaid Amounts"
              data={paidUnpaidAmountData}
              valueFormatter={(value) => `PHP ${Number(value).toLocaleString()}`}
            />
          </div>

          <SimpleBarChart
            title="Recent Fee/Payment Summary (Top 5 Recent)"
            data={recentSummaryChartData}
            valueFormatter={(value) => `PHP ${Number(value).toLocaleString()}`}
            emptyMessage="No recent payment data to chart."
          />

          <div className="card section-card">
            <h3>Recent Payments</h3>
            {payments.length === 0 ? (
              <p className="small-text">No payments yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 5).map((row) => (
                    <tr key={row.payment_id}>
                      <td>{row.payment_id}</td>
                      <td>{row.fee_name}</td>
                      <td><StatusBadge value={row.payment_status} /></td>
                      <td>PHP {Number(row.amount).toLocaleString()}</td>
                      <td>{row.paid_at ? new Date(row.paid_at).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default StudentDashboardPage;
