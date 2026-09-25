import { api } from "../lib/api";
import type { SessionUser } from "../types/auth";
import { hasPermission } from "../types/auth";

export const authService = {
  me() { return api<SessionUser>("/v1/auth/me"); },
  login(email: string, password: string) {
    return api<SessionUser>("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  logout() { return api<void>("/v1/auth/logout", { method: "POST" }); },
};

export function homePathFor(user: SessionUser) {
  if (user.roles.includes("APPLICANT")) return "/application";
  if (hasPermission(user, "vc:view")) return "/vc/dashboard";
  if (hasPermission(user, "application:view") || hasPermission(user, "user:manage") || hasPermission(user, "role:manage")) return "/admin/dashboard";
  return "/admin/login";
}
