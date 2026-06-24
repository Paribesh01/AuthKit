import { Request, Response, NextFunction } from "express";

// Simple in-memory rate limiter (swap for Redis in prod)
const store = new Map<string, { count: number; resetAt: number }>();

function createLimiter(windowMs: number, max: number, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }
    next();
  };
}

// 5 attempts per 15 min per IP — sign-in, sign-up, password reset
export const authLimiter = createLimiter(15 * 60 * 1000, 5, "Too many attempts. Try again in 15 minutes.");

// 10 requests per minute for general v1 API
export const apiLimiter = createLimiter(60 * 1000, 60, "Rate limit exceeded.");

// 3 OTP sends per 10 min
export const otpLimiter = createLimiter(10 * 60 * 1000, 3, "Too many OTP requests. Try again later.");

// Prune stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
