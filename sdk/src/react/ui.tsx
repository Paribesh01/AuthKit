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

// ── OAuth buttons ─────────────────────────────────────────────────────────────

type OAuthProvider = "google" | "github";

const OAUTH_ICONS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  ),
};

const OAUTH_LABELS: Record<OAuthProvider, string> = { google: "Google", github: "GitHub" };

interface OAuthButtonsProps {
  providers: OAuthProvider[];
  callbackUrl: string;
  label: string;
}

function OAuthButtons({ providers, callbackUrl, label }: OAuthButtonsProps) {
  const { signInWithOAuth } = useAuthContext();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", margin: "1.25rem 0" }}>
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        <span style={{ fontSize: ".75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>or {label} with</span>
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => signInWithOAuth(p, { redirectUrl: callbackUrl })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".5rem",
              width: "100%",
              padding: ".5rem .75rem",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              fontSize: ".875rem",
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              transition: "background .15s",
            }}
          >
            {OAUTH_ICONS[p]}
            Continue with {OAUTH_LABELS[p]}
          </button>
        ))}
      </div>
    </>
  );
}

// ── <SignIn /> ────────────────────────────────────────────────────────────────

export interface SignInProps {
  afterSignIn?: (user: AuthUser) => void;
  signUpUrl?: string;
  forgotPasswordUrl?: string;
  /** OAuth providers to show (e.g. ["google", "github"]) */
  oauthProviders?: OAuthProvider[];
  /** Callback URL in your app that handles the OAuth redirect */
  oauthCallbackUrl?: string;
}

export function SignIn({
  afterSignIn,
  signUpUrl = "/sign-up",
  forgotPasswordUrl = "/forgot-password",
  oauthProviders,
  oauthCallbackUrl = "/auth/callback",
}: SignInProps) {
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

      {oauthProviders && oauthProviders.length > 0 && (
        <OAuthButtons providers={oauthProviders} callbackUrl={oauthCallbackUrl} label="sign in" />
      )}
    </div>
  );
}

// ── <SignUp /> ────────────────────────────────────────────────────────────────

export interface SignUpProps {
  afterSignUp?: (user: AuthUser) => void;
  signInUrl?: string;
  showName?: boolean;
  showUsername?: boolean;
  /** OAuth providers to show (e.g. ["google", "github"]) */
  oauthProviders?: OAuthProvider[];
  /** Callback URL in your app that handles the OAuth redirect */
  oauthCallbackUrl?: string;
}

export function SignUp({
  afterSignUp,
  signInUrl = "/sign-in",
  showName = false,
  showUsername = false,
  oauthProviders,
  oauthCallbackUrl = "/auth/callback",
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

      {oauthProviders && oauthProviders.length > 0 && (
        <OAuthButtons providers={oauthProviders} callbackUrl={oauthCallbackUrl} label="sign up" />
      )}
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
