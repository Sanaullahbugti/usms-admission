import { api } from "../lib/api";
import type { ManagedUser } from "../types/auth";

export const userService = {
  list() {
    return api<ManagedUser[]>("/v1/users");
  },
  create(input: { email: string; password: string; roleName?: "VICE_CHANCELLOR" }) {
    return api<ManagedUser>("/v1/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  grantViceChancellor(userId: string) {
    return api<ManagedUser>(`/v1/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify({ roleName: "VICE_CHANCELLOR" }),
    });
  },
  revokeViceChancellor(userId: string) {
    return api<ManagedUser>(`/v1/users/${userId}/roles/VICE_CHANCELLOR`, { method: "DELETE" });
  },
};
