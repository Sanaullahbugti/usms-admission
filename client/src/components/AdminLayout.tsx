import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { applicationService } from "../services/applicationService";
import { hasRole } from "../types/auth";

function initials(email: string) {
  const local = email.split("@")[0] ?? "AD";
  const parts = local.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function roleLabel(roles: string[]) {
  if (roles.includes("SUPER_ADMIN")) {
    return "Super Admin";
  }
  if (roles.includes("VICE_CHANCELLOR")) {
    return "Vice Chancellor";
  }
  return roles.join(", ") || "Admissions";
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canOpenVc = hasRole(user, "SUPER_ADMIN", "VICE_CHANCELLOR");
  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => applicationService.listApplications(),
  });
  const rows = applications.data ?? [];
  const challanOpen = rows.filter((row) => row.paymentStatus !== "VERIFIED").length;
  const email = user?.email ?? "Admin";

  return (
    <div className="cc-shell">
      <aside className="cc-side">
        <div>
          <div className="cc-brand">
            <img className="usms-logo usms-logo--side" src="/usms-logo.png" alt="University of Sufism and Modern Sciences" />
            <div>
              <strong>Office of Admissions</strong>
              <small>Academic Directorate</small>
            </div>
          </div>
          <nav className="cc-nav">
            <NavLink to="/admin/dashboard">
              <span className="ms">dashboard</span>
              <span>Command Center</span>
            </NavLink>
            <NavLink to="/admin/applications">
              <span className="ms">folder_shared</span>
              <span>All Applications</span>
              <em>{rows.length}</em>
            </NavLink>
            <span className="cc-nav-muted">
              <span className="ms">payments</span>
              <span>Challan Verification</span>
              {challanOpen > 0 ? <em className="is-warn">{challanOpen}</em> : null}
            </span>
            <span className="cc-nav-muted">
              <span className="ms">fact_check</span>
              <span>Document Review</span>
            </span>
            <span className="cc-nav-muted">
              <span className="ms">history_edu</span>
              <span>Audit Logs</span>
            </span>
            <span className="cc-nav-muted">
              <span className="ms">rule</span>
              <span>Eligibility Rules</span>
            </span>
            <NavLink to="/admin/users">
              <span className="ms">group</span>
              <span>Users</span>
            </NavLink>
            {canOpenVc ? (
              <NavLink to="/vc/dashboard">
                <span className="ms">account_balance</span>
                <span>VC Desk</span>
              </NavLink>
            ) : null}
          </nav>
          <button className="cc-process" type="button" onClick={() => navigate("/admin/dashboard")}>
            <span className="ms">assignment_turned_in</span>
            Process dossier
          </button>
        </div>
        <div className="cc-side-foot">
          <button className="cc-side-link" type="button" onClick={() => void logout()}>
            <span className="ms">logout</span>
            Sign out
          </button>
        </div>
      </aside>
      <div className="cc-maincol">
        <header className="cc-top">
          <div className="cc-cycle">
            <span className="cc-live" aria-hidden="true" />
            <strong>Undergraduate Admission Cycle 2026-2027</strong>
            <span className="cc-session">Active session</span>
          </div>
          <div className="cc-top-tools">
            <form
              className="cc-search"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const q = String(data.get("q") ?? "").trim();
                navigate(q ? `/admin/dashboard?q=${encodeURIComponent(q)}` : "/admin/dashboard");
              }}
            >
              <span className="ms">search</span>
              <input name="q" placeholder="Search CNIC, application no., name, or mobile" />
            </form>
            <div className="cc-officer">
              <div className="cc-avatar" aria-hidden="true">{initials(email)}</div>
              <div>
                <strong>{email}</strong>
                <small>{roleLabel(user?.roles ?? [])}</small>
              </div>
            </div>
          </div>
        </header>
        <main className="cc-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
