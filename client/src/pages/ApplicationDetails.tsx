import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";

const sections = ["Overview", "Personal", "Education", "Payment"] as const;

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const [section, setSection] = useState<(typeof sections)[number]>("Overview");
  const [notice, setNotice] = useState("");
  const application = useQuery({
    queryKey: ["admin-application", id],
    queryFn: () => applicationService.getApplication(id ?? ""),
    enabled: Boolean(id),
  });

  if (application.isPending) {
    return <p>Loading application...</p>;
  }

  if (!application.data) {
    return (
      <p>
        Application not found. <Link to="/admin/applications">Back to applications</Link>
      </p>
    );
  }

  const row = application.data;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{row.applicationNo}</p>
          <h1>{row.applicantName}</h1>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="file-layout">
        <aside className="section-list">
          {sections.map((item) => (
            <button key={item} className={item === section ? "active" : undefined} type="button" onClick={() => setSection(item)}>
              {item}
            </button>
          ))}
        </aside>
        <section className="panel">
          <dl className="details">
            {section === "Overview" ? (
              <>
                <div><dt>Application no.</dt><dd>{row.applicationNo}</dd></div>
                <div><dt>Submitted</dt><dd>{row.submittedAt}</dd></div>
                <div><dt>Status</dt><dd>{row.status.replaceAll("_", " ")}</dd></div>
                <div><dt>Payment</dt><dd>{row.paymentStatus.replaceAll("_", " ")}</dd></div>
              </>
            ) : null}
            {section === "Personal" ? (
              <>
                <div><dt>Name</dt><dd>{row.applicantName}</dd></div>
                <div><dt>CNIC</dt><dd>{row.cnic}</dd></div>
                <div><dt>Mobile</dt><dd>{row.mobile}</dd></div>
                <div><dt>District</dt><dd>{row.district}</dd></div>
              </>
            ) : null}
            {section === "Education" ? (
              <>
                <div><dt>Program</dt><dd>{row.program}</dd></div>
                <div><dt>HSC %</dt><dd>{row.hscPercentage.toFixed(1)}</dd></div>
              </>
            ) : null}
            {section === "Payment" ? (
              <div>
                <dt>Challan</dt>
                <dd>{row.paymentStatus.replaceAll("_", " ")}</dd>
              </div>
            ) : null}
          </dl>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => setNotice("Change requests will be sent through the API in a later iteration.")}>
              Request change
            </button>
            <button type="button" onClick={() => setNotice("Approval is not wired to the API yet.")}>
              Approve
            </button>
            <button className="danger" type="button" onClick={() => setNotice("Rejection is not wired to the API yet.")}>
              Reject
            </button>
          </div>
          {notice ? <p className="notice">{notice}</p> : (
            <p className="notice">Admins do not silently edit submitted data. Use a change request.</p>
          )}
        </section>
      </div>
    </>
  );
}
