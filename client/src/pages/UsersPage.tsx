import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services/userService";
import { ApiError } from "../lib/api";

export function UsersPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grantVc, setGrantVc] = useState(true);
  const [message, setMessage] = useState("");
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => userService.list(),
  });

  const createUser = useMutation({
    mutationFn: () =>
      userService.create({
        email,
        password,
        roleName: grantVc ? "VICE_CHANCELLOR" : undefined,
      }),
    onSuccess: () => {
      setEmail("");
      setPassword("");
      setMessage("User created.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => {
      setMessage(error instanceof ApiError ? error.message : "Could not create user");
    },
  });

  const grant = useMutation({
    mutationFn: (userId: string) => userService.grantViceChancellor(userId),
    onSuccess: () => {
      setMessage("VICE_CHANCELLOR role granted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => userService.revokeViceChancellor(userId),
    onSuccess: () => {
      setMessage("VICE_CHANCELLOR role removed.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  function onCreate(event: FormEvent) {
    event.preventDefault();
    createUser.mutate();
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Super Admin</p>
          <h1>Users & roles</h1>
        </div>
      </div>
      <section className="panel">
        <h2>Create staff user</h2>
        <form className="form-grid" onSubmit={onCreate}>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} />
          </div>
          <div className="field full">
            <label>
              <input type="checkbox" checked={grantVc} onChange={(event) => setGrantVc(event.target.checked)} style={{ width: "auto", marginRight: 8 }} />
              Grant VICE_CHANCELLOR role
            </label>
          </div>
          <div className="actions">
            <button type="submit" disabled={createUser.isPending}>
              Create user
            </button>
          </div>
        </form>
        {message ? <p className="notice">{message}</p> : null}
      </section>
      <section className="panel">
        <h2>Directory</h2>
        {users.isPending ? <p>Loading users...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Roles</th>
                <th>VC access</th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((user) => {
                const isVc = user.roles.includes("VICE_CHANCELLOR");
                return (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.roles.join(", ") || "None"}</td>
                    <td>
                      {isVc ? (
                        <button className="secondary" type="button" onClick={() => revoke.mutate(user.id)}>
                          Remove VC role
                        </button>
                      ) : (
                        <button type="button" onClick={() => grant.mutate(user.id)}>
                          Grant VC role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
