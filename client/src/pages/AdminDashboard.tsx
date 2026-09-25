import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DossierInspector } from "../components/DossierInspector";
import { StatusBadge } from "../components/StatusBadge";
import { applicationService } from "../services/applicationService";
import type { ApplicationStatus, ChangeRequestItem, PaymentStatus } from "../types/application";

const metrics = [
  { key: "total", label: "Total apps", icon: "inventory_2" },
  { key: "submitted", label: "Submitted", icon: "send" },
  { key: "underReview", label: "Under review", icon: "pending" },
  { key: "changeRequested", label: "Change req.", icon: "edit_note" },
  { key: "challanPending", label: "Awaiting challan", icon: "receipt_long" },
  { key: "approved", label: "Approved", icon: "check_circle" },
  { key: "rejected", label: "Rejected", icon: "cancel" },
] as const;

function paymentLabel(status: PaymentStatus) {
  if (status === "VERIFIED") return "Verified";
  if (status === "SUBMITTED") return "Uploaded";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [program, setProgram] = useState("ALL");
  const [status, setStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [payment, setPayment] = useState<PaymentStatus | "ALL">("ALL");
  const [district, setDistrict] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [error, setError] = useState("");

  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => applicationService.listApplications(),
  });
  const file = useQuery({
    queryKey: ["admin-application", selectedId],
    queryFn: () => applicationService.getApplication(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });
  const requestChange = useMutation({
    mutationFn: (items: ChangeRequestItem[]) => applicationService.requestChange(selectedId ?? "", items),
    onSuccess: (updated) => {
      if (!updated) {
        setError("Could not save the change request. Pin at least one clear comment.");
        return;
      }
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-application", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
    },
  });
  const approveApplication = useMutation({
    mutationFn: (message?: string) => applicationService.approveApplication(selectedId ?? "", message),
    onSuccess: (updated) => {
      if (!updated) {
        setError("Could not approve this application.");
        return;
      }
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-application", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
    },
  });
  const rejectApplication = useMutation({
    mutationFn: (message: string) => applicationService.rejectApplication(selectedId ?? "", message),
    onSuccess: (updated) => {
      if (!updated) {
        setError("Could not reject this application. Add a clear rejection reason.");
        return;
      }
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-application", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
    },
  });
  const reviewPending = requestChange.isPending || approveApplication.isPending || rejectApplication.isPending;

  const rows = applications.data ?? [];
  const programs = [...new Set(rows.map((row) => row.program))];
  const districts = [...new Set(rows.map((row) => row.district))];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesProgram = program === "ALL" || row.program === program;
      const matchesStatus = status === "ALL" || row.status === status;
      const matchesPayment = payment === "ALL" || row.paymentStatus === payment;
      const matchesDistrict = district === "ALL" || row.district === district;
      const haystack = [row.applicationNo, row.applicantName, row.cnic, row.mobile, row.program, row.district].join(" ").toLowerCase();
      return matchesProgram && matchesStatus && matchesPayment && matchesDistrict && (needle.length === 0 || haystack.includes(needle));
    });
  }, [rows, query, program, status, payment, district]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(filtered[0].id);
      setInspectorOpen(true);
    }
  }, [filtered, selectedId]);

  if (applications.isPending) {
    return <p>Loading command center...</p>;
  }

  if (applications.isError) {
    return <p>Could not load applications. Sign in again or refresh the page.</p>;
  }

  const counts = {
    total: rows.length,
    submitted: rows.filter((row) => row.status !== "DRAFT").length,
    underReview: rows.filter((row) => row.status === "UNDER_REVIEW").length,
    changeRequested: rows.filter((row) => row.status === "CHANGE_REQUESTED").length,
    challanPending: rows.filter((row) => row.paymentStatus !== "VERIFIED").length,
    approved: rows.filter((row) => row.status === "APPROVED").length,
    rejected: rows.filter((row) => row.status === "REJECTED").length,
  };

  return (
    <div className="cc-workspace">
      <section className="cc-metrics">
        {metrics.map((item) => {
          const value = counts[item.key];
          const share = counts.total > 0 ? Math.round((value / counts.total) * 100) : 0;
          return (
            <article key={item.key} className={`cc-metric cc-metric--${item.key}`}>
              <header>
                <span>{item.label}</span>
                <span className="ms">{item.icon}</span>
              </header>
              <strong>{value}</strong>
              <small>{item.key === "underReview" ? "Queue" : `${share}%`}</small>
            </article>
          );
        })}
      </section>

      <div className={inspectorOpen ? "cc-split" : "cc-split is-list-only"}>
        <section className="cc-queue">
          <div className="cc-filters">
            <label>
              Program
              <select value={program} onChange={(event) => setProgram(event.target.value)}>
                <option value="ALL">All programs</option>
                {programs.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus | "ALL")}>
                <option value="ALL">All statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="CHANGE_REQUESTED">Change requested</option>
                <option value="DOCUMENTS_VERIFIED">Documents verified</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label>
              Challan
              <select value={payment} onChange={(event) => setPayment(event.target.value as PaymentStatus | "ALL")}>
                <option value="ALL">All</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="SUBMITTED">Uploaded</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label>
              District
              <select value={district} onChange={(event) => setDistrict(event.target.value)}>
                <option value="ALL">All districts</option>
                {districts.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <span className="cc-count">
              Showing {filtered.length} of {rows.length}
              <button className="cc-icon-btn" type="button" title="Reload queue" onClick={() => void applications.refetch()}>
                <span className="ms">refresh</span>
              </button>
            </span>
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
                {filtered.map((row) => (
                  <tr key={row.id} className={row.id === selectedId ? "is-selected" : undefined} onClick={() => { setSelectedId(row.id); setInspectorOpen(true); }}>
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
                      <button
                        className={row.id === selectedId ? "cc-btn cc-btn--cobalt" : "cc-btn cc-btn--line"}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(row.id);
                          setInspectorOpen(true);
                        }}
                      >
                        Review dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="cc-empty">No applications match these filters.</p> : null}
          </div>
        </section>

        {inspectorOpen && selectedId ? (
          file.data ? (
            <DossierInspector
              file={file.data}
              pending={reviewPending}
              error={error}
              onOpenFull={() => navigate(`/admin/applications/${file.data?.id}`)}
              onClose={() => setInspectorOpen(false)}
              onRequestChange={(items) => requestChange.mutate(items)}
              onApprove={(message) => approveApplication.mutate(message)}
              onReject={(message) => rejectApplication.mutate(message)}
            />
          ) : (
            <section className="cc-inspector"><p className="cc-empty">Loading dossier...</p></section>
          )
        ) : null}
      </div>
    </div>
  );
}
