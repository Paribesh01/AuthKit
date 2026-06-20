import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface TokenPayload {
  sub: string;
  azp: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  iat?: number;
  exp?: number;
}

export interface VerifyResult {
  valid: true;
  payload: TokenPayload;
}

export interface VerifyError {
  valid: false;
  error: string;
}

/**
 * Verify an app-user access token locally using your application's secret key.
 * Call this in your backend (Node.js) to authenticate incoming requests.
 *
 * @example
 * import { verifyToken } from "authkit/server";
 *
 * const result = verifyToken(req.headers.authorization?.split(" ")[1], {
 *   secretKey: process.env.AUTH_SECRET_KEY,
 * });
 * if (!result.valid) return res.status(401).json({ error: "Unauthorized" });
 * const userId = result.payload.sub;
 */
export function verifyToken(
  token: string,
  options: { secretKey: string }
): VerifyResult | VerifyError {
  if (!token) return { valid: false, error: "No token provided" };
  try {
    const payload = jwt.verify(token, options.secretKey) as TokenPayload;
    return { valid: true, payload };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof jwt.TokenExpiredError ? "Token expired" : "Invalid token",
    };
  }
}

/**
 * Express/Node middleware that verifies the Bearer token in the Authorization header.
 * Attaches `req.authUser` on success.
 *
 * @example
 * import { authMiddleware } from "authkit/server";
 * app.use(authMiddleware({ secretKey: process.env.AUTH_SECRET_KEY }));
 */
// ── Webhook verification ─────────────────────────────────────────────────────

export type WebhookEventType =
  | "user.created"
  | "user.signed_in"
  | "user.signed_out"
  | "user.deleted"
  | "user.banned"
  | "user.unbanned"
  | "user.password_reset";

export interface WebhookEvent<T = Record<string, unknown>> {
  type: WebhookEventType;
  timestamp: number;
  data: T;
}

/**
 * Verify an incoming webhook request and return the parsed payload.
 * Call this in your webhook handler endpoint.
 *
 * @example
 * import { verifyWebhook } from "authkit/server";
 *
 * // Express
 * app.post("/webhooks/auth", express.raw({ type: "application/json" }), (req, res) => {
 *   const event = verifyWebhook(req.body, req.headers["x-authkit-signature"], process.env.WEBHOOK_SECRET);
 *   if (!event) return res.status(400).json({ error: "Invalid signature" });
 *   if (event.type === "user.created") { ... }
 *   res.json({ received: true });
 * });
 */
export function verifyWebhook(
  rawBody: string | Buffer,
  signature: string | string[] | undefined,
  webhookSecret: string
): WebhookEvent | null {
  if (!signature || Array.isArray(signature)) return null;

  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = "sha256=" + crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");

  // Timing-safe comparison
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    return JSON.parse(body) as WebhookEvent;
  } catch {
    return null;
  }
}

export function authMiddleware(options: { secretKey: string }) {
  return (
    req: { headers: { authorization?: string }; authUser?: TokenPayload },
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void
  ) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }
    const result = verifyToken(header.slice(7), options);
    if (!result.valid) {
      res.status(401).json({ error: result.error });
      return;
    }
    req.authUser = result.payload;
    next();
  };
}
