import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";

export function ApplicantDashboard() {
  const dashboard = useQuery({
    queryKey: ["applicant-dashboard"],
    queryFn: () => applicationService.getApplicantDashboard(),
  });

  if (dashboard.isPending) {
    return <p>Loading dashboard...</p>;
  }

  if (!dashboard.data) {
    return <p>Could not load the applicant dashboard.</p>;
  }

  const data = dashboard.data;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{data.admissionCycle}</p>
          <h1>Welcome, {data.applicantName}</h1>
          <p className="muted">{data.applicationNo}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>
      <div className="card-grid">
        <div className="card">
          <span>Status</span>
          <strong>{data.status.replaceAll("_", " ")}</strong>
        </div>
        <div className="card">
          <span>Completion</span>
          <strong>{data.completionPercentage}%</strong>
          <div className="progress">
            <i style={{ width: `${data.completionPercentage}%` }} />
          </div>
        </div>
        <div className="card">
          <span>Next step</span>
          <strong>{data.pendingSections[0] ?? "Ready to review"}</strong>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Completed</h2>
          {data.completedSections.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
        <section className="panel">
          <h2>Pending</h2>
          {data.pendingSections.map((item) => (
            <p key={item}>{item}</p>
          ))}
          <div className="actions">
            <Link to="/admission/apply">
              <button type="button">Continue application</button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
