import jwt from "jsonwebtoken";

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
