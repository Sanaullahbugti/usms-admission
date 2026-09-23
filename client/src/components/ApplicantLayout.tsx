import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applicationService } from "../services/applicationService";

export function ApplicantLayout() {
  const dashboard = useQuery({
    queryKey: ["applicant-dashboard"],
    queryFn: () => applicationService.getApplicantDashboard(),
  });
  const name = dashboard.data?.applicantName ?? "Applicant";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <div className="crest">U</div>
          <div>
            <strong>Admissions Portal</strong>
            <small>USMS Undergraduate 2026-2027</small>
          </div>
        </div>
        <nav className="top-nav">
          <NavLink to="/admission/dashboard">Dashboard</NavLink>
          <NavLink to="/admission/apply">Application</NavLink>
        </nav>
        <div className="user-chip">
          <div>
            <strong>{name}</strong>
            <small>{dashboard.data?.applicationNo ?? ""}</small>
          </div>
          <div className="avatar">{initials}</div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
