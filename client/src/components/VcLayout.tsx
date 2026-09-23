import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { hasRole } from "../types/auth";

export function VcLayout() {
  const { user, logout } = useAuth();
  const isSuperAdmin = hasRole(user, "SUPER_ADMIN");

  return (
    <div className="vc-shell">
      <header className="vc-header">
        <div className="vc-header-inner">
          <div className="brand">
            <div className="crest vc-crest">U</div>
            <div>
              <strong>
                USMS <span className="vc-badge">Secretariat of the VC</span>
              </strong>
              <small>Executive Admission Governance • Session 2026-2027</small>
            </div>
          </div>
          <div className="vc-header-meta">
            <div className="vc-pulse">
              <span className="vc-dot" />
              <div>
                <small>Signed in as</small>
                <strong>{user?.email ?? "Vice Chancellor"}</strong>
              </div>
            </div>
            <div className="user-chip">
              <div>
                <strong>{user?.roles.includes("VICE_CHANCELLOR") ? "Vice Chancellor" : "Super Admin"}</strong>
                <small>{user?.roles.join(", ")}</small>
              </div>
              <button className="secondary" type="button" onClick={() => void logout()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <nav className="vc-nav">
        <NavLink to="/vc/dashboard">Dashboard</NavLink>
        {isSuperAdmin ? <NavLink to="/admin/users">Users</NavLink> : null}
        {isSuperAdmin ? <NavLink to="/admin/dashboard">Officer Workspace</NavLink> : null}
      </nav>
      <main className="page vc-page">
        <Outlet />
      </main>
    </div>
  );
}
