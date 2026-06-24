import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

// Enforce allowedOrigins per application on v1 routes.
// Skipped when allowedOrigins is empty (developer hasn't configured it yet).
export async function enforceAllowedOrigins(req: Request, res: Response, next: NextFunction) {
  const publishableKey = req.headers["x-publishable-key"] as string | undefined;
  if (!publishableKey) return next(); // let the route handler reject it

  const origin = req.headers.origin;

  // Only enforce when there's an Origin header (browser requests)
  if (!origin) return next();

  const app = await prisma.application.findUnique({
    where: { publishableKey },
    select: { allowedOrigins: true },
  });

  if (!app) return next(); // let route handler 401

  if (app.allowedOrigins.length === 0) return next(); // not configured — allow all

  const allowed = app.allowedOrigins.some(o => {
    try {
      return new URL(o).origin === new URL(origin).origin;
    } catch {
      return o === origin;
    }
  });

  if (!allowed) {
    res.status(403).json({ error: "Origin not allowed. Add it to your AuthKit application's allowed origins." });
    return;
  }

  next();
}
