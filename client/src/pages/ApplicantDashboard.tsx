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
  const canContinue =
    data.status === "DRAFT" || data.status === "CHANGE_REQUESTED" || Boolean(data.changeRequest);

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
      {data.changeRequest ? (
        <div className="action-banner">
          <strong>
            Action required · {data.changeRequest.items.length} item{data.changeRequest.items.length === 1 ? "" : "s"}
          </strong>
          <ul className="change-request-list">
            {data.changeRequest.items.map((item) => (
              <li key={item.id}>
                <em>{item.targetLabel}</em>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
          <Link to="/application">
            <button type="button">Update and resubmit</button>
          </Link>
        </div>
      ) : null}
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
          <strong>{data.pendingSections[0] ?? (data.status === "SUBMITTED" ? "Awaiting review" : "Ready to review")}</strong>
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
          {canContinue ? (
            <div className="actions">
              <Link to="/application">
                <button type="button">Continue application</button>
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
