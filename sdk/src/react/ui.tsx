import React, { useState } from "react";
import { useAuthContext } from "./context";
import type { AuthUser } from "../types";

// ── Shared primitives ────────────────────────────────────────────────────────

const s = {
  card: {
    fontFamily:
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    maxWidth: 400,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "2rem",
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
  } as React.CSSProperties,
  heading: { margin: "0 0 .25rem", fontSize: "1.25rem", fontWeight: 600, color: "#111827" } as React.CSSProperties,
  sub: { margin: "0 0 1.5rem", fontSize: ".875rem", color: "#6b7280" } as React.CSSProperties,
  label: { display: "block", fontSize: ".8125rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" } as React.CSSProperties,
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: ".5rem .75rem",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: ".875rem",
    outline: "none",
    transition: "border-color .15s",
  } as React.CSSProperties,
  field: { marginBottom: "1rem" } as React.CSSProperties,
  btn: {
    width: "100%",
    padding: ".625rem",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: ".875rem",
    fontWeight: 500,
    cursor: "pointer",
    marginTop: ".5rem",
    transition: "background .15s",
  } as React.CSSProperties,
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" } as React.CSSProperties,
  error: {
    fontSize: ".8125rem",
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: ".5rem .75rem",
    marginBottom: "1rem",
  } as React.CSSProperties,
  link: { color: "#4f46e5", textDecoration: "none", fontSize: ".875rem" } as React.CSSProperties,
  footer: { marginTop: "1.25rem", textAlign: "center" as const, fontSize: ".875rem", color: "#6b7280" },
  success: {
    textAlign: "center" as const,
    padding: "1rem 0",
  },
  successIcon: { fontSize: "2.5rem", marginBottom: ".5rem" },
};

// ── <SignIn /> ────────────────────────────────────────────────────────────────

export interface SignInProps {
  afterSignIn?: (user: AuthUser) => void;
  signUpUrl?: string;
  forgotPasswordUrl?: string;
}

export function SignIn({ afterSignIn, signUpUrl = "/sign-up", forgotPasswordUrl = "/forgot-password" }: SignInProps) {
  const { signIn } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signIn({ email, password });
      afterSignIn?.(user);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.heading}>Sign in</h2>
      <p style={s.sub}>
        No account?{" "}
        <a href={signUpUrl} style={s.link}>Sign up</a>
      </p>

      <form onSubmit={handleSubmit}>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".25rem" }}>
            <label style={{ ...s.label, marginBottom: 0 }}>Password</label>
            <a href={forgotPasswordUrl} style={{ ...s.link, fontSize: ".75rem" }}>Forgot password?</a>
          </div>
          <input
            style={s.input}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ── <SignUp /> ────────────────────────────────────────────────────────────────

export interface SignUpProps {
  afterSignUp?: (user: AuthUser) => void;
  signInUrl?: string;
  showName?: boolean;
  showUsername?: boolean;
}

export function SignUp({
  afterSignUp,
  signInUrl = "/sign-in",
  showName = false,
  showUsername = false,
}: SignUpProps) {
  const { signUp } = useAuthContext();
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "", username: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signUp({
        email: form.email,
        password: form.password,
        ...(showName ? { firstName: form.firstName, lastName: form.lastName } : {}),
        ...(showUsername ? { username: form.username } : {}),
      });
      afterSignUp?.(user);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.heading}>Create account</h2>
      <p style={s.sub}>
        Already have one?{" "}
        <a href={signInUrl} style={s.link}>Sign in</a>
      </p>

      <form onSubmit={handleSubmit}>
        {showName && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1rem" }}>
            <div>
              <label style={s.label}>First name</label>
              <input style={s.input} value={form.firstName} onChange={set("firstName")} />
            </div>
            <div>
              <label style={s.label}>Last name</label>
              <input style={s.input} value={form.lastName} onChange={set("lastName")} />
            </div>
          </div>
        )}

        {showUsername && (
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} autoComplete="username" value={form.username} onChange={set("username")} />
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

// ── <ForgotPassword /> ────────────────────────────────────────────────────────

export interface ForgotPasswordProps {
  afterSubmit?: () => void;
  signInUrl?: string;
  redirectUrl?: string;
}

export function ForgotPassword({ afterSubmit, signInUrl = "/sign-in", redirectUrl }: ForgotPasswordProps) {
  const { client } = useAuthContext();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await client.forgotPassword(email, redirectUrl);
      setSent(true);
      afterSubmit?.();
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={s.card}>
        <div style={s.success}>
          <div style={s.successIcon}>📬</div>
          <h2 style={s.heading}>Check your email</h2>
          <p style={{ ...s.sub, marginBottom: "1.5rem" }}>
            If an account exists for <strong>{email}</strong>, we sent a reset link.
          </p>
          <a href={signInUrl} style={s.link}>Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <h2 style={s.heading}>Forgot password?</h2>
      <p style={s.sub}>Enter your email and we&apos;ll send a reset link.</p>

      <form onSubmit={handleSubmit}>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div style={s.footer}>
        <a href={signInUrl} style={s.link}>Back to sign in</a>
      </div>
    </div>
  );
}

// ── <ResetPassword /> ────────────────────────────────────────────────────────

export interface ResetPasswordProps {
  token?: string;
  afterReset?: () => void;
  signInUrl?: string;
}

export function ResetPassword({ token: tokenProp, afterReset, signInUrl = "/sign-in" }: ResetPasswordProps) {
  const { client } = useAuthContext();

  // Fall back to reading ?token= from the URL in browser environments
  const token =
    tokenProp ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") ?? ""
      : "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div style={s.card}>
        <div style={s.success}>
          <p style={{ color: "#dc2626" }}>Invalid reset link.</p>
          <a href={signInUrl} style={s.link}>Back to sign in</a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={s.card}>
        <div style={s.success}>
          <div style={s.successIcon}>✅</div>
          <h2 style={s.heading}>Password reset!</h2>
          <p style={{ ...s.sub, marginBottom: "1.5rem" }}>You can now sign in with your new password.</p>
          <a href={signInUrl} style={s.link}>Sign in</a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await client.resetPassword(token, password);
      setDone(true);
      afterReset?.();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.heading}>Reset password</h2>
      <p style={s.sub}>Enter your new password below.</p>

      <form onSubmit={handleSubmit}>
        <div style={s.field}>
          <label style={s.label}>New password</label>
          <input
            style={s.input}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Confirm password</label>
          <input
            style={s.input}
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
