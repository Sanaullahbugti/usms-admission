export type RoleName = "SUPER_ADMIN" | "APPLICANT" | string;

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

export interface UserRoleSummary { id: string; name: string; }
export interface Permission { id: string; key: string; }
export interface ManagedRole {
  id: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  permissions: Permission[];
}
export interface ManagedUser {
  id: string;
  email: string;
  isActive: boolean;
  roles: UserRoleSummary[];
}

export function hasRole(user: SessionUser | null | undefined, ...roles: string[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

export function hasPermission(user: SessionUser | null | undefined, permission: string) {
  return Boolean(user?.permissions.includes("*") || user?.permissions.includes(permission));
}
