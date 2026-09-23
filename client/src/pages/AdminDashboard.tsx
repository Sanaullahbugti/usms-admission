import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";

export function AdminDashboard() {
  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => applicationService.listApplications(),
  });

  if (applications.isPending) {
    return <p>Loading command center...</p>;
  }

  const rows = applications.data ?? [];
  const counts = {
    total: rows.length,
    underReview: rows.filter((row) => row.status === "UNDER_REVIEW").length,
    changeRequested: rows.filter((row) => row.status === "CHANGE_REQUESTED").length,
    approved: rows.filter((row) => row.status === "APPROVED").length,
    rejected: rows.filter((row) => row.status === "REJECTED").length,
    challanPending: rows.filter((row) => row.paymentStatus !== "VERIFIED").length,
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Office of Admissions</p>
          <h1>Command Center</h1>
        </div>
      </div>
      <div className="stats">
        <div className="card"><span>Total apps</span><strong>{counts.total}</strong></div>
        <div className="card"><span>Under review</span><strong>{counts.underReview}</strong></div>
        <div className="card"><span>Change requested</span><strong>{counts.changeRequested}</strong></div>
        <div className="card"><span>Awaiting challan</span><strong>{counts.challanPending}</strong></div>
        <div className="card"><span>Approved</span><strong>{counts.approved}</strong></div>
        <div className="card"><span>Rejected</span><strong>{counts.rejected}</strong></div>
      </div>
      <section className="panel">
        <div className="page-heading">
          <h2>Review queue</h2>
          <Link to="/admin/applications">View all</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Program</th>
                <th>HSC %</th>
                <th>Domicile</th>
                <th>Challan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/admin/applications/${row.id}`}>{row.applicantName}</Link>
                    <div className="muted">{row.applicationNo}</div>
                  </td>
                  <td>{row.program}</td>
                  <td>{row.hscPercentage.toFixed(1)}</td>
                  <td>{row.district}</td>
                  <td>{row.paymentStatus.replaceAll("_", " ")}</td>
                  <td><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
