import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api";
import { roleService } from "../services/roleService";
import { userService } from "../services/userService";
import type { ManagedRole, ManagedUser, Permission } from "../types/auth";

const permissionLabels: Record<string, string> = {
  "application:view": "View applications",
  "application:review": "Review applications & request corrections",
  "application:approve": "Approve applications",
  "application:reject": "Reject applications",
  "document:view": "View & download candidate documents",
  "document:verify": "Verify candidate documents",
  "payment:verify": "Verify challans / payments",
  "program:manage": "Manage programs",
  "cycle:manage": "Manage admission cycles",
  "user:manage": "Create & manage users",
  "role:manage": "Create roles & assign permissions",
  "report:view": "View reports",
  "audit:view": "View audit logs",
  "vc:view": "View VC executive dashboard",
};

function permissionGroup(key: string) {
  if (key.startsWith("application:")) return "Applications";
  if (key.startsWith("document:")) return "Documents";
  if (key.startsWith("payment:")) return "Payments";
  if (key.startsWith("program:") || key.startsWith("cycle:")) return "Admission setup";
  if (key.startsWith("user:") || key.startsWith("role:")) return "Administration";
  if (key.startsWith("report:") || key.startsWith("audit:")) return "Reports & audit";
  if (key.startsWith("vc:")) return "Executive";
  return "Other";
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Something went wrong";
}

export function UsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newUserRoles, setNewUserRoles] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editingRole, setEditingRole] = useState<ManagedRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: userService.list });
  const roles = useQuery({ queryKey: ["admin-roles"], queryFn: roleService.list });
  const permissions = useQuery({ queryKey: ["admin-permissions"], queryFn: roleService.permissions });

  const groups = useMemo(() => {
    const result = new Map<string, Permission[]>();
    for (const permission of permissions.data ?? []) {
      const group = permissionGroup(permission.key);
      result.set(group, [...(result.get(group) ?? []), permission]);
    }
    return [...result.entries()];
  }, [permissions.data]);

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin-users"] }),
    qc.invalidateQueries({ queryKey: ["admin-roles"] }),
  ]);

  const createUser = useMutation({
    mutationFn: () => userService.create({ email, password, roleIds: newUserRoles }),
    onSuccess: async () => {
      setEmail(""); setPassword(""); setNewUserRoles([]); setMessage("Staff user created.");
      await refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });

  const saveUserRoles = useMutation({
    mutationFn: (input: { id: string; roleIds: string[] }) => userService.setRoles(input.id, input.roleIds),
    onSuccess: async () => { setEditingUser(null); setMessage("User roles updated."); await refresh(); },
    onError: (e) => setMessage(errorMessage(e)),
  });

  const toggleUser = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => userService.setActive(input.id, input.active),
    onSuccess: async () => { setMessage("User status updated."); await refresh(); },
    onError: (e) => setMessage(errorMessage(e)),
  });

  const saveRole = useMutation({
    mutationFn: () => editingRole
      ? roleService.update(editingRole.id, { name: roleName, permissionIds: rolePermissions })
      : roleService.create({ name: roleName, permissionIds: rolePermissions }),
    onSuccess: async () => {
      setEditingRole(null); setRoleName(""); setRolePermissions([]); setMessage("Role saved.");
      await refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });

  const deleteRole = useMutation({
    mutationFn: roleService.remove,
    onSuccess: async () => { setMessage("Role deleted."); await refresh(); },
    onError: (e) => setMessage(errorMessage(e)),
  });

  function beginRole(role?: ManagedRole) {
    setEditingRole(role ?? null);
    setRoleName(role?.name ?? "");
    setRolePermissions(role?.permissions.map((p) => p.id) ?? []);
  }

  function toggle(items: string[], id: string, setter: (next: string[]) => void) {
    setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function submitUser(event: FormEvent) { event.preventDefault(); createUser.mutate(); }
  function submitRole(event: FormEvent) { event.preventDefault(); saveRole.mutate(); }

  const assignableRoles = (roles.data ?? []).filter((role) => role.name !== "APPLICANT");

  return (
    <div className="rbac-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Users & Roles</h1>
          <p className="muted">Create staff roles once, choose exactly what each role can do, then assign roles to users.</p>
        </div>
      </div>

      <div className="rbac-tabs">
        <button className={tab === "users" ? "active" : "secondary"} onClick={() => setTab("users")}>Users</button>
        <button className={tab === "roles" ? "active" : "secondary"} onClick={() => setTab("roles")}>Roles & permissions</button>
      </div>
      {message ? <p className="notice">{message}</p> : null}

      {tab === "users" ? (
        <div className="rbac-grid">
          <section className="panel">
            <h2>Create staff user</h2>
            <p className="muted">Applicant accounts are created by the admission flow. Create university staff here.</p>
            <form className="stack" onSubmit={submitUser}>
              <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="field"><label>Temporary password</label><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <div>
                <label>Roles</label>
                <div className="rbac-checks">
                  {assignableRoles.map((role) => (
                    <label className="rbac-check" key={role.id}>
                      <input type="checkbox" checked={newUserRoles.includes(role.id)} onChange={() => toggle(newUserRoles, role.id, setNewUserRoles)} />
                      <span><strong>{role.name}</strong><small>{role.permissions.length} permissions</small></span>
                    </label>
                  ))}
                </div>
              </div>
              <button disabled={createUser.isPending}>{createUser.isPending ? "Creating..." : "Create staff user"}</button>
            </form>
          </section>

          <section className="panel rbac-directory">
            <div className="rbac-section-head"><div><h2>Staff directory</h2><p className="muted">{(users.data ?? []).filter(u => !u.roles.some(r => r.name === "APPLICANT")).length} staff accounts</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Roles</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(users.data ?? []).filter(u => !u.roles.some(r => r.name === "APPLICANT")).map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.email}</strong></td>
                      <td><div className="rbac-pills">{user.roles.map((role) => <span key={role.id}>{role.name}</span>)}</div></td>
                      <td><span className={`status ${user.isActive ? "status--approved" : "status--rejected"}`}>{user.isActive ? "Active" : "Disabled"}</span></td>
                      <td><div className="rbac-actions"><button className="secondary" onClick={() => setEditingUser(user)}>Manage roles</button><button className="secondary" onClick={() => toggleUser.mutate({ id: user.id, active: !user.isActive })}>{user.isActive ? "Disable" : "Enable"}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="rbac-grid">
          <section className="panel">
            <h2>{editingRole ? `Edit ${editingRole.name}` : "Create role"}</h2>
            <p className="muted">A role is a reusable set of permissions. Example: Admission Office, Finance Office, Reviewer.</p>
            <form className="stack" onSubmit={submitRole}>
              <div className="field"><label>Role name</label><input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Admission Office" required /></div>
              <div className="rbac-permission-groups">
                {groups.map(([group, items]) => (
                  <div className="rbac-permission-group" key={group}>
                    <strong>{group}</strong>
                    {items.map((permission) => (
                      <label className="rbac-check" key={permission.id}>
                        <input type="checkbox" checked={rolePermissions.includes(permission.id)} onChange={() => toggle(rolePermissions, permission.id, setRolePermissions)} />
                        <span><strong>{permissionLabels[permission.key] ?? permission.key}</strong><small>{permission.key}</small></span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="rbac-actions">
                <button disabled={saveRole.isPending}>{saveRole.isPending ? "Saving..." : editingRole ? "Save role" : "Create role"}</button>
                {editingRole ? <button type="button" className="secondary" onClick={() => beginRole()}>Cancel</button> : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="rbac-section-head"><div><h2>Roles</h2><p className="muted">Access is inherited from all roles assigned to a user.</p></div></div>
            <div className="rbac-role-list">
              {(roles.data ?? []).map((role) => (
                <article className="rbac-role-card" key={role.id}>
                  <div>
                    <div className="rbac-role-title"><strong>{role.name}</strong>{role.isSystem ? <span>System</span> : null}</div>
                    <small>{role.userCount} users · {role.name === "SUPER_ADMIN" ? "Full system access" : `${role.permissions.length} permissions`}</small>
                  </div>
                  <div className="rbac-actions">
                    {!role.isSystem ? <button className="secondary" onClick={() => beginRole(role)}>Edit</button> : null}
                    {!role.isSystem ? <button className="secondary" disabled={role.userCount > 0 || deleteRole.isPending} onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRole.mutate(role.id); }}>Delete</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {editingUser ? (
        <div className="inspect-overlay" onClick={() => setEditingUser(null)}>
          <section className="inspect-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Roles for {editingUser.email}</h2>
            <p className="muted">Changes take effect on the user's next authorized request.</p>
            <div className="rbac-checks">
              {assignableRoles.map((role) => {
                const selected = editingUser.roles.some((item) => item.id === role.id);
                return (
                  <label className="rbac-check" key={role.id}>
                    <input type="checkbox" checked={selected} onChange={() => setEditingUser({ ...editingUser, roles: selected ? editingUser.roles.filter(r => r.id !== role.id) : [...editingUser.roles, { id: role.id, name: role.name }] })} />
                    <span><strong>{role.name}</strong><small>{role.name === "SUPER_ADMIN" ? "Full system access" : `${role.permissions.length} permissions`}</small></span>
                  </label>
                );
              })}
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button onClick={() => saveUserRoles.mutate({ id: editingUser.id, roleIds: editingUser.roles.map(r => r.id) })}>Save roles</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
