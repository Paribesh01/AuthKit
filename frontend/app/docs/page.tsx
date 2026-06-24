"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "@/components/syntax-highlight";

const sections = [
  { id: "quick-start", label: "Quick Start" },
  { id: "installation", label: "Installation" },
  { id: "auth-provider", label: "AuthProvider" },
  { id: "use-auth", label: "useAuth & useUser" },
  { id: "guards", label: "Guards" },
  { id: "pre-built", label: "Pre-built Components" },
  { id: "nextjs", label: "Next.js Middleware" },
  { id: "server", label: "Server SDK" },
  { id: "oauth", label: "OAuth" },
  { id: "sessions", label: "Session Management" },
  { id: "webhooks", label: "Webhooks" },
  { id: "metadata", label: "User Metadata" },
];

const Code = CodeBlock;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-16">
      <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-sm leading-7 mb-3">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-white/90 mt-6 mb-2">{children}</h3>;
}

function Pill({ children }: { children: string }) {
  return (
    <code className="inline-block text-xs font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md">
      {children}
    </code>
  );
}

function PropTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden my-4 text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02]">
            <th className="px-4 py-2 text-left text-[10px] text-white/30 uppercase tracking-wider font-medium">Prop</th>
            <th className="px-4 py-2 text-left text-[10px] text-white/30 uppercase tracking-wider font-medium">Type</th>
            <th className="px-4 py-2 text-left text-[10px] text-white/30 uppercase tracking-wider font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map(([prop, type, desc]) => (
            <tr key={prop} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 font-mono text-violet-300 text-xs whitespace-nowrap">{prop}</td>
              <td className="px-4 py-2.5 font-mono text-amber-300/70 text-xs whitespace-nowrap">{type}</td>
              <td className="px-4 py-2.5 text-white/40 text-xs">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quick-start");

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[30%] w-[600px] h-[400px] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      {/* Top nav */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#080808]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-sm">
              Auth<span className="text-violet-400">Kit</span>
            </Link>
            <span className="text-white/20 text-xs">Docs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors">Dashboard →</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex relative z-10">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-white/[0.06] py-8 px-3">
          <p className="px-3 text-[10px] font-medium text-white/25 uppercase tracking-widest mb-3">Reference</p>
          <nav className="space-y-0.5">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  activeSection === s.id
                    ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                    : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-12 py-12 max-w-3xl">

          {/* Quick Start */}
          <Section id="quick-start" title="Quick Start">
            <P>AuthKit is a self-hosted authentication service. You get an API server, a developer dashboard, and an SDK — all under your own infrastructure.</P>
            <P>This guide walks you from zero to a protected Next.js route in under 5 minutes.</P>
            <Code lang="bash">{`
# 1. Install the SDK
npm install @paribeshn/authkit

# 2. Create an account at your AuthKit instance and make an app
# 3. Copy your Publishable Key and Secret Key from the dashboard
            `}</Code>
            <Code lang="tsx">{`
// app/layout.tsx
"use client";
import { AuthProvider } from "@paribeshn/authkit/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider
          publishableKey={process.env.NEXT_PUBLIC_PUBLISHABLE_KEY}
          baseUrl={process.env.NEXT_PUBLIC_API_URL}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
            `}</Code>
            <Code lang="ts">{`
// middleware.ts
import { authkitMiddleware } from "@paribeshn/authkit/nextjs";

export default authkitMiddleware({
  secretKey: process.env.AUTH_SECRET_KEY!,
  signInUrl: "/sign-in",
  publicRoutes: ["/sign-in", "/sign-up", "/forgot-password"],
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
            `}</Code>
            <Code lang="tsx">{`
// app/dashboard/page.tsx — protected automatically by middleware
"use client";
import { useAuth } from "@paribeshn/authkit/react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <div>
      <p>Hello, {user?.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
            `}</Code>
          </Section>

          {/* Installation */}
          <Section id="installation" title="Installation">
            <P>Install the SDK from npm. It ships ESM and CJS with full TypeScript types.</P>
            <Code lang="bash">{`npm install @paribeshn/authkit`}</Code>
            <P>The package has three entrypoints:</P>
            <PropTable rows={[
              ["@paribeshn/authkit/react", "module", "AuthProvider, useAuth, useUser, guards, pre-built UI components"],
              ["@paribeshn/authkit/nextjs", "module", "authkitMiddleware, getUserFromRequest"],
              ["@paribeshn/authkit/server", "module", "verifyToken, authMiddleware, verifyWebhook"],
            ]} />
            <H3>Environment variables</H3>
            <Code lang="bash">{`
# .env.local
NEXT_PUBLIC_PUBLISHABLE_KEY=pk_live_...     # from dashboard — safe to expose
NEXT_PUBLIC_API_URL=https://your-api.com   # your AuthKit backend URL
AUTH_SECRET_KEY=sk_live_...               # secret key — server only, never expose
            `}</Code>
          </Section>

          {/* AuthProvider */}
          <Section id="auth-provider" title="AuthProvider">
            <P><Pill>AuthProvider</Pill> is the React context that powers all hooks and guards. Wrap your root layout with it.</P>
            <Code lang="tsx">{`
import { AuthProvider } from "@paribeshn/authkit/react";

<AuthProvider
  publishableKey="pk_live_..."
  baseUrl="https://your-authkit-api.com"
>
  {children}
</AuthProvider>
            `}</Code>
            <PropTable rows={[
              ["publishableKey", "string", "Your app's publishable key from the dashboard."],
              ["baseUrl", "string", "URL of your AuthKit backend (no trailing slash)."],
            ]} />
            <P><Pill>AuthProvider</Pill> manages token refresh automatically in the background. Tokens are stored in sessionStorage so they survive hot-reloads without re-auth.</P>
          </Section>

          {/* useAuth & useUser */}
          <Section id="use-auth" title="useAuth & useUser">
            <P>These hooks give you auth state and actions anywhere inside <Pill>AuthProvider</Pill>.</P>
            <H3>useAuth</H3>
            <Code lang="tsx">{`
import { useAuth } from "@paribeshn/authkit/react";

function MyComponent() {
  const {
    isLoaded,      // false while initial token check is in progress
    isSignedIn,    // true when user has a valid session
    user,          // AppUser | null
    accessToken,   // current JWT access token
    signOut,       // () => Promise<void>
  } = useAuth();

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return <p>Not signed in</p>;
  return <p>Hello, {user.email}</p>;
}
            `}</Code>
            <H3>useUser</H3>
            <Code lang="tsx">{`
import { useUser } from "@paribeshn/authkit/react";

function Profile() {
  const { user, isLoaded } = useUser();

  return (
    <div>
      <p>{user?.firstName} {user?.lastName}</p>
      <p>{user?.email}</p>
      <p>Verified: {user?.emailVerified ? "Yes" : "No"}</p>
    </div>
  );
}
            `}</Code>
            <PropTable rows={[
              ["id", "string", "Unique user ID"],
              ["email", "string | null", "User's email address"],
              ["username", "string | null", "Username (if set)"],
              ["firstName", "string | null", "First name"],
              ["lastName", "string | null", "Last name"],
              ["emailVerified", "boolean", "Whether the email is verified"],
              ["banned", "boolean", "Whether this user is banned"],
              ["publicMetadata", "object", "App-controlled public metadata"],
              ["lastSignInAt", "string | null", "ISO timestamp of last sign-in"],
            ]} />
          </Section>

          {/* Guards */}
          <Section id="guards" title="Guards">
            <P>Use guards to conditionally render content based on auth state — no middleware needed for client-side gating.</P>
            <H3>AuthGuard</H3>
            <P>Renders <Pill>fallback</Pill> (defaults to null) when the user is not signed in.</P>
            <Code lang="tsx">{`
import { AuthGuard } from "@paribeshn/authkit/react";

<AuthGuard fallback={<p>Please sign in.</p>}>
  <PrivateContent />
</AuthGuard>
            `}</Code>
            <H3>GuestGuard</H3>
            <P>Renders <Pill>fallback</Pill> when the user IS signed in. Useful for sign-in/up pages.</P>
            <Code lang="tsx">{`
import { GuestGuard } from "@paribeshn/authkit/react";

<GuestGuard fallback={<Redirect to="/dashboard" />}>
  <SignInForm />
</GuestGuard>
            `}</Code>
          </Section>

          {/* Pre-built components */}
          <Section id="pre-built" title="Pre-built Components">
            <P>Drop-in forms that handle sign-up, sign-in, and password reset for your app users. They call your AuthKit backend automatically.</P>
            <Code lang="tsx">{`
import {
  SignIn,
  SignUp,
  ForgotPassword,
  ResetPassword,
} from "@paribeshn/authkit/react";

// Sign-in page
export default function SignInPage() {
  return (
    <SignIn
      onSuccess={() => router.push("/dashboard")}
      signUpUrl="/sign-up"
      forgotPasswordUrl="/forgot-password"
    />
  );
}

// Sign-up page
export default function SignUpPage() {
  return (
    <SignUp
      onSuccess={() => router.push("/dashboard")}
      signInUrl="/sign-in"
    />
  );
}

// Forgot password page
export default function ForgotPage() {
  return <ForgotPassword signInUrl="/sign-in" />;
}

// Reset password page — reads token from ?token=... query param
export default function ResetPage() {
  return (
    <ResetPassword onSuccess={() => router.push("/sign-in")} />
  );
}
            `}</Code>
          </Section>

          {/* Next.js */}
          <Section id="nextjs" title="Next.js Middleware">
            <H3>authkitMiddleware</H3>
            <P>Protects routes at the edge. Redirects unauthenticated requests to <Pill>signInUrl</Pill>. Verified requests pass through with the decoded session injected into headers.</P>
            <Code lang="ts">{`
import { authkitMiddleware } from "@paribeshn/authkit/nextjs";

export default authkitMiddleware({
  secretKey: process.env.AUTH_SECRET_KEY!,
  signInUrl: "/sign-in",
  publicRoutes: [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ],
});

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.png$).*)"],
};
            `}</Code>
            <PropTable rows={[
              ["secretKey", "string", "Your app's secret key from the dashboard."],
              ["signInUrl", "string", "Path to redirect unauthenticated users to."],
              ["publicRoutes", "string[]", "Routes that bypass authentication."],
            ]} />
            <H3>getUserFromRequest</H3>
            <P>Extract the verified user from a Next.js request inside Server Components or Route Handlers.</P>
            <Code lang="ts">{`
import { getUserFromRequest } from "@paribeshn/authkit/nextjs";
import { NextRequest } from "next/server";

// Route handler
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req, {
    secretKey: process.env.AUTH_SECRET_KEY!,
  });

  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ userId: user.sub });
}
            `}</Code>
          </Section>

          {/* Server */}
          <Section id="server" title="Server SDK">
            <H3>verifyToken</H3>
            <P>Verify a JWT access token in any Node.js context (Express, Fastify, etc.).</P>
            <Code lang="ts">{`
import { verifyToken } from "@paribeshn/authkit/server";

const payload = await verifyToken(token, secretKey);
// payload.sub — user ID
// payload.appId — application ID
// payload.exp — expiry timestamp
            `}</Code>
            <H3>authMiddleware (Express)</H3>
            <P>Express middleware that verifies the <Pill>Authorization: Bearer</Pill> header and attaches <Pill>req.auth</Pill> to the request.</P>
            <Code lang="ts">{`
import express from "express";
import { authMiddleware } from "@paribeshn/authkit/server";

const app = express();

app.use(
  "/api/protected",
  authMiddleware({ secretKey: process.env.AUTH_SECRET_KEY! }),
  (req, res) => {
    // req.auth.sub — verified user ID
    res.json({ userId: req.auth.sub });
  }
);
            `}</Code>
            <H3>verifyWebhook</H3>
            <P>Verify that a webhook payload came from your AuthKit server. Uses HMAC-SHA256.</P>
            <Code lang="ts">{`
import { verifyWebhook } from "@paribeshn/authkit/server";

// Express example
app.post("/webhooks/auth", express.raw({ type: "*/*" }), (req, res) => {
  const signature = req.headers["x-authkit-signature"] as string;

  const event = verifyWebhook(
    req.body,           // raw Buffer or string
    signature,
    process.env.WEBHOOK_SECRET!
  );

  // event.type — "user.created" | "user.signed_in" | ...
  // event.data — user object

  switch (event.type) {
    case "user.created":
      console.log("New user:", event.data.email);
      break;
    case "user.deleted":
      console.log("Deleted:", event.data.id);
      break;
  }

  res.json({ received: true });
});
            `}</Code>
          </Section>

          {/* OAuth */}
          <Section id="oauth" title="OAuth">
            <P>Support Google and GitHub login without writing any redirect logic. Configure providers from the dashboard, then call one function.</P>
            <H3>Setup (dashboard)</H3>
            <P>1. In the AuthKit dashboard, open your app → OAuth Providers → Add provider.</P>
            <P>2. Register the callback URL in your OAuth provider&apos;s settings:</P>
            <Code lang="bash">{`https://your-authkit-api.com/v1/oauth/{provider}/callback`}</Code>
            <P>3. Paste your Client ID and Client Secret into the dashboard form.</P>
            <H3>Client usage</H3>
            <Code lang="tsx">{`
import { useAuth } from "@paribeshn/authkit/react";

function LoginButtons() {
  const { signInWithOAuth } = useAuth();

  return (
    <div>
      <button onClick={() => signInWithOAuth("google")}>
        Continue with Google
      </button>
      <button onClick={() => signInWithOAuth("github")}>
        Continue with GitHub
      </button>
    </div>
  );
}
            `}</Code>
            <P><Pill>signInWithOAuth</Pill> redirects the user to the provider. After they authorize, they&apos;re redirected to <Pill>/auth/callback</Pill> in your app, which exchanges the code and establishes a session automatically.</P>
            <H3>Callback route</H3>
            <P>Add <Pill>/auth/callback</Pill> to your <Pill>publicRoutes</Pill> in <Pill>authkitMiddleware</Pill> so it is not blocked before the session is created.</P>
          </Section>

          {/* Session Management */}
          <Section id="sessions" title="Session Management">
            <P>Users can view active sessions (devices) and revoke them individually or all at once.</P>
            <Code lang="tsx">{`
import { useAuth } from "@paribeshn/authkit/react";

function SessionsPanel() {
  const { listSessions, revokeSession, revokeAllSessions } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  return (
    <ul>
      {sessions.map(session => (
        <li key={session.id}>
          <span>{session.userAgent}</span>
          {session.isCurrent && <span>(current)</span>}
          <button onClick={() => revokeSession(session.id)}>
            Revoke
          </button>
        </li>
      ))}
    </ul>
  );
}
            `}</Code>
            <PropTable rows={[
              ["listSessions()", "() => Promise<Session[]>", "List all active sessions for the current user."],
              ["revokeSession(id)", "(id: string) => Promise<void>", "Revoke a single session by ID."],
              ["revokeAllSessions()", "() => Promise<void>", "Revoke every session except the current one."],
            ]} />
            <PropTable rows={[
              ["id", "string", "Session ID"],
              ["userAgent", "string | null", "Browser/device user-agent string"],
              ["ipAddress", "string | null", "IP address at sign-in"],
              ["createdAt", "string", "ISO timestamp when session was created"],
              ["isCurrent", "boolean", "Whether this is the caller's active session"],
            ]} />
          </Section>

          {/* Webhooks */}
          <Section id="webhooks" title="Webhooks">
            <P>AuthKit fires HMAC-SHA256 signed webhooks on every user lifecycle event. Configure the URL in the dashboard under your app → Webhooks.</P>
            <H3>Events</H3>
            <PropTable rows={[
              ["user.created", "object", "Fired when a user signs up for the first time."],
              ["user.signed_in", "object", "Fired on every successful sign-in."],
              ["user.banned", "object", "Fired when an admin bans a user."],
              ["user.unbanned", "object", "Fired when an admin unbans a user."],
              ["user.deleted", "object", "Fired when a user or admin deletes an account."],
            ]} />
            <H3>Payload shape</H3>
            <Code lang="json">{`
{
  "type": "user.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "usr_abc123",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "emailVerified": true,
    "banned": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
            `}</Code>
            <H3>Verifying the signature</H3>
            <Code lang="ts">{`
import { verifyWebhook } from "@paribeshn/authkit/server";

// The signature is in the X-AuthKit-Signature header
// The raw body must be passed (not JSON.parse'd)

const event = verifyWebhook(rawBody, signature, webhookSecret);

if (!event) {
  return res.status(401).send("Invalid signature");
}

console.log(event.type, event.data);
            `}</Code>
          </Section>

          {/* User Metadata */}
          <Section id="metadata" title="User Metadata">
            <P>Attach arbitrary JSON to any user. <Pill>publicMetadata</Pill> is readable from the client; <Pill>privateMetadata</Pill> is server-only.</P>
            <H3>From the server</H3>
            <Code lang="ts">{`
// Set metadata via the AuthKit REST API
// PATCH /v1/users/:userId/metadata
// Authorization: Bearer <secretKey>

await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/v1/users/\${userId}/metadata\`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.AUTH_SECRET_KEY}\`,
  },
  body: JSON.stringify({
    publicMetadata: { role: "admin", plan: "pro" },
    privateMetadata: { stripeCustomerId: "cus_xyz" },
  }),
});
            `}</Code>
            <H3>Reading on the client</H3>
            <Code lang="tsx">{`
import { useUser } from "@paribeshn/authkit/react";

function RoleBadge() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  return role ? <span>{role}</span> : null;
}
            `}</Code>
          </Section>

          {/* Bottom CTA */}
          <div className="border border-violet-500/20 rounded-2xl p-8 text-center bg-violet-500/5 mt-8">
            <p className="font-semibold mb-2">Ready to start building?</p>
            <p className="text-sm text-white/40 mb-5">Create an account, make an app, and get your keys in under a minute.</p>
            <Link
              href="/sign-up"
              className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Get started →
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
