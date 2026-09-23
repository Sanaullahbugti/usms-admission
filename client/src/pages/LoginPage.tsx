import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { homePathFor } from "../services/authService";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@usms.edu.pk");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!isLoading && user) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const session = await login(email, password);
      navigate(homePathFor(session), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <div className="panel">
        <p className="eyebrow">USMS Admissions</p>
        <h1>Sign in</h1>
        <p className="muted">Super Admin assigns the Vice Chancellor role from Users.</p>
        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: 20 }}>
          <div className="field full">
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </div>
          <div className="field full">
            <label>Password</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} />
          </div>
          {error ? <p className="notice">{error}</p> : null}
          <div className="actions full">
            <button type="submit" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
