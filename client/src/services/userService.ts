import { api } from "../lib/api";
import type { ManagedUser } from "../types/auth";

export const userService = {
  list() { return api<ManagedUser[]>("/v1/users"); },
  create(input: { email: string; password: string; roleIds: string[] }) {
    return api<ManagedUser>("/v1/users", { method: "POST", body: JSON.stringify(input) });
  },
  setRoles(userId: string, roleIds: string[]) {
    return api<ManagedUser>(`/v1/users/${userId}/roles`, { method: "PUT", body: JSON.stringify({ roleIds }) });
  },
  setActive(userId: string, isActive: boolean) {
    return api<ManagedUser>(`/v1/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
  },
};
