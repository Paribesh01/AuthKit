// Edge-compatible utilities for Next.js (App Router + Pages Router).
// Uses Web Crypto API — no Node-only dependencies — so this file is safe
// to import in middleware.ts (Edge Runtime) and in server components/API routes.

export interface TokenPayload {
  sub: string;
  azp: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// ── JWT verification (HS256, Web Crypto) ────────────────────────────────────

function b64urlToBytes(b64: string): ArrayBuffer {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function verifyHS256(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload))
    ) as TokenPayload;

    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch {
    return null;
  }
}

// ── getUserFromRequest ────────────────────────────────────────────────────────

/**
 * Extract and verify the current user from an incoming request.
 * Works in Next.js API routes, Route Handlers, and Server Components.
 *
 * @example
 * // app/api/protected/route.ts
 * import { getUserFromRequest } from "authkit/nextjs";
 *
 * export async function GET(req: Request) {
 *   const user = await getUserFromRequest(req, { secretKey: process.env.AUTH_SECRET_KEY! });
 *   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
 *   return Response.json({ userId: user.sub });
 * }
 */
export async function getUserFromRequest(
  req: Request | { headers: { get(k: string): string | null } },
  options: { secretKey: string }
): Promise<TokenPayload | null> {
  // 1. Try Authorization: Bearer <token>
  const authHeader =
    typeof (req.headers as Headers).get === "function"
      ? (req.headers as Headers).get("authorization")
      : (req.headers as { authorization?: string }).authorization ?? null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyHS256(token, options.secretKey);
  }

  // 2. Fall back to __authkit_at cookie (set by the SDK client after sign-in)
  const cookieHeader =
    typeof (req.headers as Headers).get === "function"
      ? (req.headers as Headers).get("cookie")
      : null;

  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)__authkit_at=([^;]+)/);
    if (match?.[1]) {
      return verifyHS256(decodeURIComponent(match[1]), options.secretKey);
    }
  }

  return null;
}

// ── authkitMiddleware ────────────────────────────────────────────────────────

export interface MiddlewareOptions {
  secretKey: string;
  /** URL to redirect unauthenticated users to. Default: "/sign-in" */
  signInUrl?: string;
  /**
   * Routes that don't require authentication.
   * Strings are matched as prefixes; RegExp tested against pathname.
   * Default public routes: /sign-in, /sign-up, /forgot-password, /reset-password
   */
  publicRoutes?: (string | RegExp)[];
  /**
   * Called after auth check. Return a Response to override default behaviour,
   * or return nothing to let the middleware proceed normally.
   */
  afterAuth?: (
    user: TokenPayload | null,
    req: Request
  ) => Response | void | Promise<Response | void>;
}

const DEFAULT_PUBLIC = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

function isPublic(pathname: string, rules: (string | RegExp)[]): boolean {
  return rules.some((rule) =>
    typeof rule === "string"
      ? pathname === rule || pathname.startsWith(rule + "/")
      : rule.test(pathname)
  );
}

/**
 * Drop into your Next.js middleware.ts to protect routes automatically.
 *
 * @example
 * // middleware.ts (project root)
 * import { authkitMiddleware } from "authkit/nextjs";
 *
 * export default authkitMiddleware({
 *   secretKey: process.env.AUTH_SECRET_KEY!,
 *   signInUrl: "/sign-in",
 *   publicRoutes: ["/sign-in", "/sign-up", /^\/api\/public/],
 * });
 *
 * export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
 */
export function authkitMiddleware(options: MiddlewareOptions) {
  const { secretKey, signInUrl = "/sign-in", afterAuth } = options;
  const publicRoutes = [...DEFAULT_PUBLIC, ...(options.publicRoutes ?? [])];

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const { pathname } = url;

    // Skip Next.js internals and static files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.match(/\.\w+$/)
    ) {
      return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } });
    }

    // Verify token from cookie
    const cookieHeader = (req.headers as Headers).get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)__authkit_at=([^;]+)/);
    const token = match?.[1] ? decodeURIComponent(match[1]) : null;
    const user = token ? await verifyHS256(token, secretKey) : null;

    // Allow custom handler to override
    if (afterAuth) {
      const override = await afterAuth(user, req);
      if (override) return override;
    }

    // Allow public routes through regardless of auth state
    if (isPublic(pathname, publicRoutes)) {
      return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } });
    }

    // Redirect unauthenticated users
    if (!user) {
      const loginUrl = new URL(signInUrl, url.origin);
      loginUrl.searchParams.set("redirect_url", pathname);
      return Response.redirect(loginUrl.toString(), 307);
    }

    return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } });
  };
}
