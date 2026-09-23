export type RoleName = "SUPER_ADMIN" | "VICE_CHANCELLOR";

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

export interface ManagedUser {
  id: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

export function hasRole(user: SessionUser | null | undefined, ...roles: RoleName[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role as RoleName)));
}
