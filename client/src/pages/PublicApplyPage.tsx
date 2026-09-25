import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";

type SubmitResult = {
  applicationNo: string;
  emailSent: boolean;
  temporaryPassword?: string;
  message: string;
};

type FieldKey = "applicantName" | "fatherName" | "cnicBform" | "email";

function firstFieldError(errors: Record<string, string[]>, key: FieldKey) {
  return errors[key]?.[0] ?? "";
}

export function PublicApplyPage() {
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (result) {
      window.scrollTo({ top: 0 });
    }
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setErrorCode("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<SubmitResult>("/v1/applications/public/submit", {
        method: "POST",
        body: JSON.stringify({
          applicantName: String(form.get("applicantName") ?? "").trim(),
          fatherName: String(form.get("fatherName") ?? "").trim(),
          cnicBform: String(form.get("cnicBform") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
        }),
      });
      setResult(data);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setErrorCode(caught.code);
        setFieldErrors(caught.fieldErrors);
      } else {
        setError(caught instanceof Error ? caught.message : "Could not start the application");
      }
    } finally {
      setBusy(false);
    }
  }

  const showSignInHint = errorCode === "EMAIL_TAKEN" || errorCode === "DUPLICATE_APPLICATION";

  return (
    <div className="portal">
      <header className="portal-header">
        <div className="portal-brand">
          <img className="usms-logo" src="/usms-logo.png" alt="University of Sufism and Modern Sciences" />
          <div>
            <strong>Admissions Portal</strong>
            <small>University Admission System</small>
          </div>
        </div>
        <Link className="portal-login" to="/login">
          Applicant login
        </Link>
      </header>

      <main className="portal-main">
        {result ? (
          <section className="portal-card portal-success">
            <div className="portal-success-mark" aria-hidden="true">
              <span className="ms">check_circle</span>
            </div>
            <p className="eyebrow">File opened</p>
            <h1>Check your email, then sign in</h1>
            <p className="portal-lede">
              {result.emailSent
                ? "We sent your application number and a temporary password. After you sign in, the application steps open."
                : "Email is not configured on this server, so the temporary password is shown once here."}
            </p>
            <div className="credential-box">
              <span>Application number</span>
              <strong>{result.applicationNo}</strong>
              {result.emailSent ? (
                <>
                  <span>Next step</span>
                  <strong>Open the email, then sign in</strong>
                </>
              ) : (
                <>
                  <span>Temporary password</span>
                  <strong>{result.temporaryPassword}</strong>
                </>
              )}
            </div>
            <Link className="portal-submit" to="/login">
              Sign in and continue
            </Link>
          </section>
        ) : (
          <section className="portal-card">
            <div className="portal-card-head">
              <div>
                <p className="eyebrow">Start here</p>
                <h1>Open your admission file</h1>
                <p className="portal-lede">
                  Enter the name, father’s name, CNIC or B-Form, and email exactly as you will use them later. The rest of the form opens after you sign in.
                </p>
              </div>
              <span className="portal-pill">
                <span className="ms">badge</span>
                Identity only
              </span>
            </div>
            <form className="portal-form" onSubmit={submit} noValidate>
              <div className="portal-grid">
                <label className={firstFieldError(fieldErrors, "applicantName") ? "is-invalid" : undefined}>
                  Full applicant name *
                  <input name="applicantName" required minLength={3} autoComplete="name" aria-invalid={Boolean(firstFieldError(fieldErrors, "applicantName"))} />
                  {firstFieldError(fieldErrors, "applicantName") ? (
                    <small className="portal-field-error">{firstFieldError(fieldErrors, "applicantName")}</small>
                  ) : null}
                </label>
                <label className={firstFieldError(fieldErrors, "fatherName") ? "is-invalid" : undefined}>
                  Father / guardian name *
                  <input name="fatherName" required minLength={3} aria-invalid={Boolean(firstFieldError(fieldErrors, "fatherName"))} />
                  {firstFieldError(fieldErrors, "fatherName") ? (
                    <small className="portal-field-error">{firstFieldError(fieldErrors, "fatherName")}</small>
                  ) : null}
                </label>
                <label className={firstFieldError(fieldErrors, "cnicBform") ? "is-invalid" : undefined}>
                  CNIC / B-Form number *
                  <input
                    name="cnicBform"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="42101-7890123-5"
                    aria-invalid={Boolean(firstFieldError(fieldErrors, "cnicBform"))}
                  />
                  {firstFieldError(fieldErrors, "cnicBform") ? (
                    <small className="portal-field-error">{firstFieldError(fieldErrors, "cnicBform")}</small>
                  ) : (
                    <small className="portal-field-hint">13 digits. Dashes are optional.</small>
                  )}
                </label>
                <label className={firstFieldError(fieldErrors, "email") ? "is-invalid" : undefined}>
                  Email address *
                  <input name="email" required type="email" autoComplete="email" aria-invalid={Boolean(firstFieldError(fieldErrors, "email"))} />
                  {firstFieldError(fieldErrors, "email") ? (
                    <small className="portal-field-error">{firstFieldError(fieldErrors, "email")}</small>
                  ) : null}
                </label>
              </div>
              {error ? (
                <div className="error-box">
                  <p>{error}</p>
                  {showSignInHint ? (
                    <p>
                      Already registered? <Link to="/login">Sign in here</Link>.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <button className="portal-submit" type="submit" disabled={busy}>
                {busy ? "Opening your file…" : "Continue and email my login"}
              </button>
              <small>A temporary password is sent to this email. Sign in next to complete the application.</small>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
