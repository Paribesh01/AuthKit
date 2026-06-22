# AuthKit — Self-Hosted Auth Service

A production-ready, self-hosted authentication service. Provides a developer dashboard for managing applications and users, a public API for end-user auth (`/v1/`), and a TypeScript SDK (`@paribeshn/authkit`) that developers drop into their own apps.

---

## Architecture

```
authkit/
├── backend/      Express API (TypeScript, Prisma 7, Neon PostgreSQL)
├── frontend/     Developer dashboard (Next.js, Tailwind CSS)
├── sdk/          @paribeshn/authkit — TypeScript SDK for end-user apps (tsup, ESM + CJS)
└── example/      Example Next.js app using the SDK (clone and run)
```

**Three API surfaces:**

| Prefix | Auth | Used by |
|--------|------|---------|
| `/api/auth/*` | Email + password | Developer signing into the dashboard |
| `/api/dashboard/*` | Developer JWT | Dashboard frontend managing apps/users |
| `/v1/*` | Publishable key / Secret key | End-user auth from the developer's app |

---

## Features

| # | Feature |
|---|---------|
| 1 | Multi-tenant applications — each developer can create multiple apps |
| 2 | Email + password auth for both developers and app users |
| 3 | Password reset via email (Resend) for both dashboard and end users |
| 4 | Email verification on sign-up |
| 5 | Pre-built `<SignIn>`, `<SignUp>`, `<ForgotPassword>`, `<ResetPassword>` React components |
| 6 | Next.js utilities — `getUserFromRequest` + `authkitMiddleware` (Edge-compatible) |
| 7 | Webhooks — signed HMAC-SHA256 events fired on user lifecycle actions |
| 8 | OAuth — Google and GitHub social login |
| 9 | User metadata — `publicMetadata` (user-writable) + `privateMetadata` (server-only) |
| 10 | Session management — list, revoke one, or revoke all sessions |
| 11 | User management dashboard — ban, unban, delete, paginate |
| 12 | Local JWT verification in SDK — no network call needed |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A [Neon](https://neon.tech) PostgreSQL database (or any PostgreSQL)
- A [Resend](https://resend.com) account for emails

### 1. Backend

```bash
cd backend
pnpm install
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://...

JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

PORT=4000
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:4000

RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
```

Run migrations and start:

```bash
pnpm exec prisma migrate deploy
pnpm dev
```

### 2. Frontend (Developer Dashboard)

```bash
cd frontend
pnpm install
pnpm dev        # runs on http://localhost:3000
```

### 3. Example app

A fully working Next.js app demonstrating the SDK — sign-in, sign-up, OAuth, session management, and protected routes.

```bash
cd example
pnpm install
pnpm dev   # http://localhost:3001
```

Set `NEXT_PUBLIC_PUBLISHABLE_KEY` in `example/.env.local` to your app's publishable key from the dashboard. The backend URL defaults to the hosted instance.

### 4. SDK (for development)

```bash
cd sdk
pnpm install
pnpm build      # outputs to sdk/dist/
```

---

## SDK — `@paribeshn/authkit`

Published on npm: [npmjs.com/package/@paribeshn/authkit](https://www.npmjs.com/package/@paribeshn/authkit)

```bash
npm install @paribeshn/authkit
# or: pnpm add @paribeshn/authkit
```

> During development, `pnpm link ../path/to/sdk` from your app lets you use the local build.

### React — `authkit/react`

**Wrap your app:**

```tsx
import { AuthProvider } from "@paribeshn/authkit/react";

export default function App({ children }) {
  return (
    <AuthProvider
      publishableKey="pk_live_xxxx"
      baseUrl="http://localhost:4000"
    >
      {children}
    </AuthProvider>
  );
}
```

**Hooks:**

```tsx
import { useAuth, useUser } from "@paribeshn/authkit/react";

function Profile() {
  const { user, isLoaded, isSignedIn, signOut } = useAuth();

  if (!isLoaded) return <p>Loading...</p>;
  if (!isSignedIn) return <p>Not signed in</p>;

  return (
    <div>
      <p>Hello, {user.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

**Guard components:**

```tsx
import { SignedIn, SignedOut, AuthLoaded } from "@paribeshn/authkit/react";

<SignedIn>  <Dashboard />  </SignedIn>
<SignedOut> <LandingPage /></SignedOut>
```

**Pre-built UI components** (no CSS framework required — inline styles):

```tsx
import { SignIn, SignUp, ForgotPassword, ResetPassword } from "@paribeshn/authkit/react";

// Drop-in sign-in form
<SignIn
  afterSignIn={(user) => router.push("/dashboard")}
  signUpUrl="/sign-up"
  forgotPasswordUrl="/forgot-password"
/>

// Drop-in sign-up form
<SignUp
  afterSignUp={(user) => router.push("/dashboard")}
  showName         // adds first/last name fields
  showUsername     // adds username field
/>

// Forgot password
<ForgotPassword redirectUrl="https://myapp.com/reset-password" />

// Reset password (reads ?token= from URL automatically)
<ResetPassword afterReset={() => router.push("/sign-in")} />
```

**Session management:**

```tsx
const { client } = useAuth();

// List active sessions
const sessions = await client.getSessions();
// [{ id, userAgent, ipAddress, createdAt, expiresAt, isCurrent }]

// Revoke a specific session (e.g. "sign out of this device")
await client.revokeSession(session.id);

// Sign out of all devices
await client.revokeAllSessions();
```

**User metadata:**

```tsx
// Update public metadata (user-facing)
await client.updateMetadata({ plan: "pro", onboardingComplete: true });
```

**OAuth:**

```tsx
// Redirect to Google/GitHub OAuth
client.signInWithOAuth("google", {
  redirectUrl: "http://localhost:3001/auth/callback",
});

// On your callback page — reads tokens from URL, stores them
const user = await client.handleOAuthCallback();
if (user) router.push("/dashboard");
```

### Next.js — `authkit/nextjs`

**Protect routes in `middleware.ts`:**

```ts
// middleware.ts (project root)
import { authkitMiddleware } from "@paribeshn/authkit/nextjs";

export default authkitMiddleware({
  secretKey: process.env.AUTH_SECRET_KEY!,
  signInUrl: "/sign-in",
  publicRoutes: ["/sign-in", "/sign-up", /^\/api\/public/],
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
```

**Read the current user in API routes / Server Components:**

```ts
// app/api/me/route.ts
import { getUserFromRequest } from "@paribeshn/authkit/nextjs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req, {
    secretKey: process.env.AUTH_SECRET_KEY!,
  });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ userId: user.sub, email: user.email });
}
```

### Server — `authkit/server`

**Verify tokens in any Node.js backend:**

```ts
import { verifyToken, authMiddleware } from "@paribeshn/authkit/server";

// One-shot verification
const result = verifyToken(token, { secretKey: process.env.AUTH_SECRET_KEY! });
if (result.valid) console.log(result.payload.sub);

// Express middleware
app.use(authMiddleware({ secretKey: process.env.AUTH_SECRET_KEY! }));
app.get("/protected", (req, res) => res.json({ user: req.authUser }));
```

**Verify incoming webhooks:**

```ts
import { verifyWebhook } from "@paribeshn/authkit/server";

// Use express.raw() so the body is a Buffer (required for signature check)
app.post("/webhooks/auth", express.raw({ type: "application/json" }), (req, res) => {
  const event = verifyWebhook(
    req.body,
    req.headers["x-authkit-signature"],
    process.env.WEBHOOK_SECRET!
  );
  if (!event) return res.status(400).json({ error: "Invalid signature" });

  switch (event.type) {
    case "user.created":  /* sync to your DB */ break;
    case "user.deleted":  /* clean up */        break;
    case "user.banned":   /* revoke access */   break;
  }

  res.json({ received: true });
});
```

---

## API Reference

### Auth — `/api/auth/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create developer account |
| POST | `/login` | Sign in as developer |
| POST | `/refresh` | Refresh developer access token |
| POST | `/logout` | Sign out |
| GET | `/verify-email/:token` | Verify developer email |
| POST | `/forgot-password` | Send developer password reset email |
| POST | `/reset-password` | Reset developer password |
| GET | `/me` | Get current developer |

### Dashboard — `/api/dashboard/` *(requires developer JWT)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/applications` | List developer's apps |
| POST | `/applications` | Create app |
| GET | `/applications/:id` | Get app (includes keys + webhook secret) |
| PATCH | `/applications/:id` | Update name / allowedOrigins / webhookUrl |
| DELETE | `/applications/:id` | Delete app |
| POST | `/applications/:id/rotate-key` | Rotate secret key |
| POST | `/applications/:id/rotate-webhook-secret` | Rotate webhook signing secret |
| GET | `/applications/:id/oauth-providers` | List OAuth providers |
| POST | `/applications/:id/oauth-providers` | Add/update OAuth provider |
| DELETE | `/applications/:id/oauth-providers/:provider` | Remove OAuth provider |
| GET | `/applications/:id/users` | List users (paginated) |
| GET | `/applications/:id/users/:uid` | Get user |
| POST | `/applications/:id/users/:uid/ban` | Ban user |
| POST | `/applications/:id/users/:uid/unban` | Unban user |
| DELETE | `/applications/:id/users/:uid` | Delete user |
| PATCH | `/applications/:id/users/:uid/metadata` | Update user metadata |
| DELETE | `/applications/:id/users/:uid/sessions` | Revoke all user sessions |

### End-user API — `/v1/` *(publishable key in `x-publishable-key` header)*

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sign-up` | Create end user + session |
| POST | `/sign-in` | Sign in end user |
| POST | `/refresh` | Refresh end-user access token |
| POST | `/sign-out` | Sign out end user |
| GET | `/me` | Get current user (includes `publicMetadata`) |
| PATCH | `/me/metadata` | Update own `publicMetadata` |
| GET | `/me/sessions` | List active sessions |
| DELETE | `/me/sessions` | Revoke all sessions |
| DELETE | `/me/sessions/:id` | Revoke specific session |
| GET | `/verify-email/:token` | Verify end-user email |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset end-user password |
| GET | `/oauth/:provider` | Start OAuth flow (Google/GitHub) |
| GET | `/oauth/:provider/callback` | OAuth callback (handled by service) |

**Secret-key-only** (use `Authorization: Bearer sk_live_...`):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/verify-token` | Verify an access token server-side |
| GET | `/users/:uid` | Get user (includes `privateMetadata`) |
| PATCH | `/users/:uid/metadata` | Update `publicMetadata` + `privateMetadata` |

---

## Webhook Events

All events are signed with `HMAC-SHA256`. Verify with `verifyWebhook()` from `authkit/server`.

| Event | Fired when |
|-------|-----------|
| `user.created` | New user signs up (password or OAuth) |
| `user.signed_in` | User signs in |
| `user.banned` | Developer bans a user |
| `user.unbanned` | Developer unbans a user |
| `user.deleted` | Developer deletes a user |
| `user.password_reset` | User resets their password |

Payload shape:
```json
{
  "type": "user.created",
  "timestamp": 1718000000000,
  "data": { "id": "...", "email": "..." }
}
```

Headers sent with every webhook request:
- `x-authkit-signature: sha256=<hmac>`
- `x-authkit-event: user.created`

---

## OAuth Setup

For each provider you want to support:

1. Create an OAuth application on [Google Cloud Console](https://console.cloud.google.com) or [GitHub Developer Settings](https://github.com/settings/developers)
2. Register the callback URL: `{API_URL}/v1/oauth/{provider}/callback`
   - Dev: `http://localhost:4000/v1/oauth/google/callback`
3. Add the credentials in your dashboard → App → OAuth Providers

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Signs developer access tokens |
| `JWT_REFRESH_SECRET` | Yes | Signs developer refresh tokens + OAuth state |
| `ACCESS_TOKEN_EXPIRY` | Yes | e.g. `15m` |
| `REFRESH_TOKEN_EXPIRY` | Yes | e.g. `7d` |
| `PORT` | Yes | Backend port (default `4000`) |
| `CLIENT_URL` | Yes | Dashboard URL for CORS (e.g. `http://localhost:3000`) |
| `API_URL` | Yes | Backend public URL (used in OAuth callbacks) |
| `RESEND_API_KEY` | Yes | Resend API key for sending emails |
| `EMAIL_FROM` | No | From address (default `onboarding@resend.dev`) |

---

## License

MIT
