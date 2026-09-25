import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { hasPermission } from "../types/auth";

export function RequirePermission({
  permissions,
  children,
  loginPath = "/admin/login",
}: {
  permissions: string[];
  children: React.ReactNode;
  loginPath?: string;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className="page">Checking your access...</p>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (!permissions.some((permission) => hasPermission(user, permission))) {
    return (
      <div className="page">
        <h1>Access denied</h1>
        <p className="muted">Your assigned role does not include access to this area.</p>
      </div>
    );
  }
  return children;
}
