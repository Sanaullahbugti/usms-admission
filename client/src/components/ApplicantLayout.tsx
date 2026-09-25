import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { applicationService } from "../services/applicationService";

export function ApplicantLayout() {
  const { user, logout } = useAuth();
  const dashboard = useQuery({
    queryKey: ["applicant-dashboard"],
    queryFn: () => applicationService.getApplicantDashboard(),
  });
  const name = dashboard.data?.applicantName ?? user?.email ?? "Applicant";
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <header className="app-header">
        <div className="brand" aria-label="USMS Admissions Portal">
          <img className="usms-logo" src="/usms-logo.png" alt="University of Sufism and Modern Sciences" />
          <div className="brand-copy">
            <strong className="brand-title-full">Admissions Portal</strong>
            <strong className="brand-title-short">Admissions</strong>
            <small className="brand-subtitle">{dashboard.data?.admissionCycle ?? "USMS Undergraduate"}</small>
          </div>
        </div>
        <div className="user-chip">
          <div className="user-chip-meta">
            <strong>{name}</strong>
            <small>{dashboard.data?.applicationNo ?? user?.email ?? ""}</small>
          </div>
          <div className="avatar" aria-hidden="true">
            {initials || "AP"}
          </div>
          <button className="secondary header-logout" type="button" onClick={() => void logout()} aria-label="Sign out">
            <span className="ms" aria-hidden="true">
              logout
            </span>
            <span className="header-logout-label">Sign out</span>
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
