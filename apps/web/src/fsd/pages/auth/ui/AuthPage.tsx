"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};
import { useSearchParams } from "next/navigation";

type Mode = "login" | "signup" | "forgot" | "reset" | "check-email";
type Field = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/chat";
  return value;
}

function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return "";
}

function validatePassword(value: string, mode: Mode): string {
  if (!value) return "Enter your password.";
  if (mode !== "login" && value.length < 8) return "Use at least 8 characters.";
  if (mode !== "login" && value.length > 128) return "Use 128 characters or fewer.";
  return "";
}

async function postAuth(path: string, body: Record<string, string>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.filter((item: unknown) => typeof item === "string").join(" ") : "Request failed";
    throw new Error(response.status === 502 ? "service-unavailable" : message);
  }
  return data;
}

function EyeIcon({ visible }: { visible: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {visible ? <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a14.4 14.4 0 0 1-3 3.5M6.6 6.6A14.7 14.7 0 0 0 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5" /><path d="M10 10a3 3 0 0 0 4 4" /></>}
  </svg>;
}

export function AuthPage() {
  const search = useSearchParams();
  const initial = search.get("mode");
  const [mode, setMode] = useState<Mode>(initial === "signup" || initial === "forgot" || initial === "reset" ? initial : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(search.get("oauth_error") ? "Could not sign in with Google. Please try again." : "");
  const [notice, setNotice] = useState("");
  const [checkKind, setCheckKind] = useState<"verify" | "reset">("verify");
  // Until React takes over, a native submit would put the password in the URL.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const next = useMemo(() => safeNext(search.get("next")), [search]);
  const resetToken = search.get("token") || "";

  useEffect(() => {
    if (!window.location.hash.startsWith("#auth-token=")) return;
    const token = window.location.hash.slice(12);
    if (!token) return;
    localStorage.setItem("authToken", token);
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    const returnTo = sessionStorage.getItem("authReturnTo");
    sessionStorage.removeItem("authReturnTo");
    window.location.replace(returnTo ? safeNext(returnTo) : next);
  }, [next]);

  const validateField = (field: Field, value: string): string => {
    if (field === "name") {
      const trimmed = value.trim();
      if (!trimmed) return "Enter your name.";
      if (trimmed.length > 50) return "Use 50 characters or fewer.";
      return "";
    }
    if (field === "email") return validateEmail(value);
    if (field === "password") return validatePassword(value, mode);
    if (!value) return "Confirm your password.";
    return value === password ? "" : "Passwords do not match.";
  };

  const updateField = (field: Field, value: string, setter: (value: string) => void) => {
    setter(value);
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    if (field === "password" && confirmPassword && (mode === "signup" || mode === "reset")) {
      setFieldErrors((current) => ({ ...current, confirmPassword: confirmPassword === value ? "" : "Passwords do not match." }));
    }
    if (error) setError("");
  };

  const blurField = (field: Field, value: string) => {
    setFieldErrors((current) => ({ ...current, [field]: validateField(field, value) }));
  };

  const changeMode = (value: Mode) => {
    setMode(value);
    setError("");
    setNotice("");
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  };

  const startOAuth = async () => {
    setError("");
    try {
      const response = await fetch("/api/auth/providers", { cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const providers = await response.json();
      if (providers.google !== true) {
        setError("Google sign-in is not connected yet. Use email for now.");
        return;
      }
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    sessionStorage.setItem("authReturnTo", next);
    window.location.assign(new URL("/auth/google", window.location.origin).toString());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const checks: FieldErrors = {};
    if (mode === "signup") checks.name = validateField("name", name);
    if (mode !== "reset") checks.email = validateEmail(email);
    if (mode === "login" || mode === "signup" || mode === "reset") checks.password = validatePassword(password, mode);
    if (mode === "signup" || mode === "reset") checks.confirmPassword = validateField("confirmPassword", confirmPassword);
    setFieldErrors(checks);
    if (Object.values(checks).some(Boolean)) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const data = await postAuth("login", { email: email.trim().toLowerCase(), password });
        if (!data.access_token || !data.user) throw new Error("Something went wrong. Try again.");
        localStorage.setItem("authToken", data.access_token);
        localStorage.setItem("userName", data.user.name || "");
        localStorage.setItem("userEmail", data.user.email || email);
        localStorage.setItem("userRole", data.user.role || "user");
        window.location.assign(next);
        return;
      }
      if (mode === "signup") {
        const referralCode = localStorage.getItem("pending_referral_code") || "";
        await postAuth("register", { name: name.trim(), email: email.trim().toLowerCase(), password, ...(referralCode ? { referralCode } : {}) });
        setCheckKind("verify");
        changeMode("check-email");
      } else if (mode === "forgot") {
        await postAuth("forgot-password", { email: email.trim().toLowerCase() });
        setCheckKind("reset");
        changeMode("check-email");
      } else if (mode === "reset") {
        await postAuth("reset-password", { token: resetToken, password });
        changeMode("login");
        setNotice("Password changed. Sign in with your new password.");
        window.history.replaceState({}, "", `/sign-in?next=${encodeURIComponent(next)}`);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (mode === "signup" && /verification email could not be sent/i.test(message)) {
        setCheckKind("verify");
        changeMode("check-email");
        setError("Your account was created, but we couldn't send the verification email. Try sending it again below.");
      } else if (message === "service-unavailable") setError("Sign-in is temporarily unavailable. Please try again shortly.");
      else if (mode === "login" && /verify your email/i.test(message)) {
        setCheckKind("verify");
        changeMode("check-email");
      } else if (mode === "reset" && /expired|invalid (or )?reset link|invalid token/i.test(message)) setError("This link has expired. Request a new one.");
      else if (mode === "login") setError("Email or password is incorrect.");
      else if (mode === "signup" && /already exists/i.test(message)) setFieldErrors({ email: "An account with this email already exists. Sign in instead." });
      else if (/email/i.test(message) && /invalid|format|too long|must be an email/i.test(message)) setFieldErrors({ email: "Enter a valid email address." });
      else if (/name/i.test(message) && /required|empty|characters|too long/i.test(message)) setFieldErrors({ name: "Enter a name with 50 characters or fewer." });
      else if (/password/i.test(message) && /characters|length|empty/i.test(message)) setFieldErrors({ password: "Use a password with 8–128 characters." });
      else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await postAuth(checkKind === "reset" ? "forgot-password" : "resend-verification", { email });
      setNotice("If this address needs an email, a new link is on its way.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signup" ? "Create your workspace" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : mode === "check-email" ? "Check your inbox" : "Welcome back";
  const intro = mode === "signup" ? "Create an account to keep your work in one place." : mode === "forgot" ? "We'll email you a secure link to reset your password." : mode === "reset" ? "Enter and confirm your new password." : mode === "check-email" ? "Check your email for a link to continue. If it hasn't arrived, you can resend it." : "Sign in to continue where you left off.";
  const fieldError = (field: Field) => fieldErrors[field] ? <p id={`gx-auth-${field}-error`} className="gx-auth-field-error">{fieldErrors[field]}</p> : null;

  return <main className={`gx-auth-page gx-auth-page--${mode}`}>
    <header className="gx-auth-top">
      <a href="/" className="gx-auth-brand"><img src="/images/logo.svg" width="34" height="34" alt="" /><span>Genyxo</span></a>
    </header>
    <div className="gx-auth-layout">
      <section className="gx-auth-panel" aria-labelledby="gx-auth-title">
        <div className="gx-auth-card">
          <h1 id="gx-auth-title">{title}</h1>
          <p className="gx-auth-intro">{intro}</p>
          {(mode === "login" || mode === "signup") && <><div className="gx-auth-providers">
            <button type="button" onClick={() => void startOAuth()}><svg className="gx-auth-google" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.22c0-.68-.06-1.36-.18-2.02H12v3.82h5.24a4.49 4.49 0 0 1-1.94 2.95v2.46h3.14c1.84-1.7 2.91-4.2 2.91-7.21Z"/><path fill="#34A853" d="M12 21.72c2.62 0 4.83-.87 6.44-2.29l-3.14-2.46c-.87.58-1.98.93-3.3.93a5.95 5.95 0 0 1-5.6-4.12H3.17v2.54A9.73 9.73 0 0 0 12 21.72Z"/><path fill="#FBBC05" d="M6.4 13.78a5.83 5.83 0 0 1 0-3.56V7.68H3.17a9.72 9.72 0 0 0 0 8.64l3.23-2.54Z"/><path fill="#EA4335" d="M12 6.1c1.39 0 2.63.48 3.61 1.41l2.71-2.71A9.22 9.22 0 0 0 12 2.28a9.73 9.73 0 0 0-8.83 5.4l3.23 2.54A5.95 5.95 0 0 1 12 6.1Z"/></svg>Continue with Google</button>
          </div><div className="gx-auth-divider"><span>or use email</span></div></>}
          {error && <p className="gx-auth-error" role="alert">{error}</p>}
          {notice && <p className="gx-auth-notice" role="status">{notice}</p>}
          {mode !== "check-email" ? <form method="post" onSubmit={submit} noValidate>
            {mode === "signup" && <div className="gx-auth-field"><label htmlFor="gx-auth-name">Your name</label><input id="gx-auth-name" name="name" type="text" autoComplete="name" maxLength={51} value={name} onChange={(event) => updateField("name", event.target.value, setName)} onBlur={() => blurField("name", name)} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "gx-auth-name-error" : undefined} placeholder="Your name" />{fieldError("name")}</div>}
            {mode !== "reset" && <div className="gx-auth-field"><label htmlFor="gx-auth-email">Email address</label><input id="gx-auth-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={255} value={email} onChange={(event) => updateField("email", event.target.value, setEmail)} onBlur={() => blurField("email", email)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "gx-auth-email-error" : undefined} placeholder="you@example.com" />{fieldError("email")}</div>}
            {(mode === "login" || mode === "signup" || mode === "reset") && <div className="gx-auth-field"><label htmlFor="gx-auth-password">{mode === "reset" ? "New password" : "Password"}</label><div className="gx-auth-password"><input id="gx-auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={mode === "login" ? undefined : 129} value={password} onChange={(event) => updateField("password", event.target.value, setPassword)} onBlur={() => blurField("password", password)} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "gx-auth-password-error" : undefined} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><EyeIcon visible={showPassword} /></button></div>{fieldError("password")}{mode === "login" && <button className="gx-auth-forgot" type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>}</div>}
            {(mode === "signup" || mode === "reset") && <div className="gx-auth-field"><label htmlFor="gx-auth-confirm">Confirm your password</label><div className="gx-auth-password"><input id="gx-auth-confirm" name="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value, setConfirmPassword)} onBlur={() => blurField("confirmPassword", confirmPassword)} aria-invalid={!!fieldErrors.confirmPassword} aria-describedby={fieldErrors.confirmPassword ? "gx-auth-confirmPassword-error" : undefined} placeholder="Repeat your password" /><button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirm}><EyeIcon visible={showConfirm} /></button></div>{fieldError("confirmPassword")}</div>}
            <button className="gx-auth-submit" type="submit" disabled={busy || !hydrated}>{busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Save password" : "Sign in"}<span aria-hidden="true">→</span></button>
          </form> : <div className="gx-auth-check">{email && <strong>{email}</strong>}{notice && <p role="status">{notice}</p>}<button type="button" disabled={busy || !email} onClick={resend}>{checkKind === "reset" ? "Send another reset link" : "Resend verification email"}</button><button type="button" onClick={() => changeMode(checkKind === "reset" ? "forgot" : "signup")}>Use a different email</button>{process.env.NODE_ENV !== "production" && <a className="gx-auth-dev-inbox" href="http://localhost:8025" target="_blank" rel="noreferrer">Development: open the local inbox (Mailpit) ↗</a>}</div>}
          <div className="gx-auth-switch">{mode === "login" ? <>New to Genyxo? <button type="button" onClick={() => changeMode("signup")}>Create an account</button></> : <button type="button" onClick={() => changeMode("login")}>← Back to sign in</button>}</div>
          {mode === "signup" && <p className="gx-auth-legal">By creating an account, you agree to our <a href="/policies/terms-of-service">Terms</a> and <a href="/policies/privacy-policy">Privacy Policy</a>.</p>}
        </div>
      </section>
    </div>
  </main>;
}
