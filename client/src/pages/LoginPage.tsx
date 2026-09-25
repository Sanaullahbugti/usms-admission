import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { homePathFor } from "../services/authService";
import { ApiError } from "../lib/api";
import type { SessionUser } from "../types/auth";

type LoginAudience = "applicant" | "admin";

const copy: Record<
  LoginAudience,
  {
    eyebrow: string;
    title: string;
    lede: string;
    passwordLabel: string;
    footer: ReactNode;
  }
> = {
  applicant: {
    eyebrow: "Applicant sign in",
    title: "Continue your application",
    lede: "Use the email and temporary password from the message we sent after you opened your file.",
    passwordLabel: "Temporary password *",
    footer: (
      <small>
        New applicant? <Link to="/apply">Open a file first</Link>
      </small>
    ),
  },
  admin: {
    eyebrow: "Staff sign in",
    title: "Admissions administration",
    lede: "Sign in with your university staff account to review applications and manage admissions.",
    passwordLabel: "Password *",
    footer: (
      <small>
        Applicant? <Link to="/login">Use the applicant sign-in</Link>
      </small>
    ),
  },
};

function isStaff(user: SessionUser) {
  return user.roles.includes("SUPER_ADMIN") || user.roles.includes("VICE_CHANCELLOR");
}

export function LoginPage({ audience = "applicant" }: { audience?: LoginAudience }) {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const text = copy[audience];

  if (!isLoading && user) {
    if (audience === "admin" && !isStaff(user)) {
      return <Navigate to="/application" replace />;
    }
    if (audience === "applicant" && isStaff(user)) {
      return <Navigate to={homePathFor(user)} replace />;
    }
    return <Navigate to={homePathFor(user)} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const session = await login(email, password);
      if (audience === "admin" && !isStaff(session)) {
        setError("This sign-in is for admissions staff only. Applicants should use the applicant login.");
        return;
      }
      if (audience === "applicant" && isStaff(session)) {
        navigate(homePathFor(session), { replace: true });
        return;
      }
      navigate(homePathFor(session), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="portal">
      <header className="portal-header">
        <Link className="portal-brand" to={audience === "admin" ? "/admin/login" : "/apply"}>
          <img className="usms-logo" src="/usms-logo.png" alt="University of Sufism and Modern Sciences" />
          <div>
            <strong>Admissions Portal</strong>
            <small>{audience === "admin" ? "Staff access" : "University Admission System"}</small>
          </div>
        </Link>
      </header>
      <main className="portal-main">
        <section className="portal-card portal-card--narrow">
          <div className="portal-card-head">
            <div>
              <p className="eyebrow">{text.eyebrow}</p>
              <h1>{text.title}</h1>
              <p className="portal-lede">{text.lede}</p>
            </div>
          </div>
          <form className="portal-form" onSubmit={onSubmit}>
            <div className="portal-grid portal-grid--one">
              <label>
                Email address *
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="username" />
              </label>
              <label>
                {text.passwordLabel}
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </label>
            </div>
            {error ? <div className="error-box">{error}</div> : null}
            <button className="portal-submit" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
            {text.footer}
          </form>
        </section>
      </main>
    </div>
  );
}
