import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";
import type { ApplicationStatus, PaymentStatus } from "../types/application";

function paymentLabel(status: PaymentStatus) {
  if (status === "VERIFIED") return "Verified";
  if (status === "SUBMITTED") return "Uploaded";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

export function ApplicationsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => applicationService.listApplications(),
  });
  const rows = useMemo(() => {
    const source = applications.data ?? [];
    const needle = query.trim().toLowerCase();
    return source.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const haystack = [row.applicationNo, row.applicantName, row.cnic, row.mobile, row.program, row.district].join(" ").toLowerCase();
      return matchesStatus && (needle.length === 0 || haystack.includes(needle));
    });
  }, [applications.data, query, status]);

  if (applications.isPending) {
    return <p>Loading applications...</p>;
  }

  if (applications.isError) {
    return <p>Could not load applications. Sign in again or refresh the page.</p>;
  }

  return (
    <section className="cc-queue cc-queue--page">
      <div className="cc-filters">
        <label className="is-search">
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CNIC, application no., or name" />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus | "ALL")}>
            <option value="ALL">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="CHANGE_REQUESTED">Change requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <span className="cc-count">Showing {rows.length}</span>
      </div>
      <div className="cc-table-wrap">
        <table className="cc-table">
          <thead>
            <tr>
              <th>Applicant & app no.</th>
              <th>Program</th>
              <th>HSC %</th>
              <th>Domicile</th>
              <th>Challan</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.applicantName}</strong>
                  <span>{row.applicationNo}</span>
                  <small>{row.cnic}</small>
                </td>
                <td>{row.program}</td>
                <td>{row.hscPercentage.toFixed(1)}%</td>
                <td>{row.district}</td>
                <td><span className={`cc-pay cc-pay--${row.paymentStatus.toLowerCase()}`}>{paymentLabel(row.paymentStatus)}</span></td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <Link className="cc-btn cc-btn--line" to={`/admin/applications/${row.id}`}>Open file</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
