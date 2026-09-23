import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { hasRole } from "../types/auth";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const canOpenVc = hasRole(user, "SUPER_ADMIN", "VICE_CHANCELLOR");

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="crest">U</div>
          <div>
            <strong>Office of Admissions</strong>
            <small>Academic Directorate</small>
          </div>
        </div>
        <nav>
          <NavLink to="/admin/dashboard">Command Center</NavLink>
          <NavLink to="/admin/applications">All Applications</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          {canOpenVc ? <NavLink to="/vc/dashboard">VC Desk</NavLink> : null}
          <span className="nav-disabled">Challan Verification</span>
        </nav>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <strong>Undergraduate Admission Cycle 2026-2027</strong>
            <span className="status">Active Session</span>
          </div>
          <div className="user-chip">
            <div>
              <strong>{user?.email ?? "Admin"}</strong>
              <small>{user?.roles.join(", ")}</small>
            </div>
            <button className="secondary" type="button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
