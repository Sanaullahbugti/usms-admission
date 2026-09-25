import { api } from "../lib/api";
import type { SessionUser } from "../types/auth";

export const authService = {
  me() {
    return api<SessionUser>("/v1/auth/me");
  },
  login(email: string, password: string) {
    return api<SessionUser>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return api<void>("/v1/auth/logout", { method: "POST" });
  },
};

export function homePathFor(user: SessionUser) {
  if (user.roles.includes("SUPER_ADMIN")) {
    return "/admin/dashboard";
  }
  if (user.roles.includes("VICE_CHANCELLOR")) {
    return "/vc/dashboard";
  }
  return "/application";
}
