import { api } from "../lib/api";
import type { ManagedRole, Permission } from "../types/auth";

export const roleService = {
  list() { return api<ManagedRole[]>("/v1/roles"); },
  permissions() { return api<Permission[]>("/v1/roles/permissions"); },
  create(input: { name: string; permissionIds: string[] }) {
    return api<ManagedRole>("/v1/roles", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string, input: { name: string; permissionIds: string[] }) {
    return api<ManagedRole>(`/v1/roles/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  remove(id: string) { return api<void>(`/v1/roles/${id}`, { method: "DELETE" }); },
};
