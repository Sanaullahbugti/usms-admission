import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";
import type { ApplicationStatus } from "../types/application";

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
      const haystack = [row.applicationNo, row.applicantName, row.cnic, row.program, row.district].join(" ").toLowerCase();
      return matchesStatus && (needle.length === 0 || haystack.includes(needle));
    });
  }, [applications.data, query, status]);

  if (applications.isPending) {
    return <p>Loading applications...</p>;
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h1>All Applications</h1>
        </div>
      </div>
      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CNIC, app no, or name" />
        <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus | "ALL")}>
          <option value="ALL">All statuses</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="CHANGE_REQUESTED">Change requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <section className="panel">
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
