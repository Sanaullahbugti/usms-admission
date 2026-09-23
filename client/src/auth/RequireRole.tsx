import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { hasRole, type RoleName } from "../types/auth";

export function RequireRole({ roles, children }: { roles: RoleName[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="page">Checking your access...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, ...roles)) {
    return (
      <div className="page">
        <h1>Access denied</h1>
        <p className="muted">This area is only available to {roles.join(" or ")}.</p>
      </div>
    );
  }

  return children;
}
