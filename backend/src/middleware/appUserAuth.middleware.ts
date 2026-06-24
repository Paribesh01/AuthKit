import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { verifyAppToken } from "../lib/appJwt";
import { AppContext } from "./apiKey.middleware";

declare global {
  namespace Express {
    interface Request {
      appUser?: {
        id: string;
        email: string | null;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        emailVerified: boolean;
        banned: boolean;
      };
    }
  }
}

export async function requireAppUserToken(req: Request, res: Response, next: NextFunction) {
  const app = req.application as AppContext | undefined;
  if (!app) {
    res.status(401).json({ error: "Missing application context" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }

  const token = authHeader.startsWith("Bearer pk_live_") || authHeader.startsWith("Bearer sk_live_")
    ? null
    : authHeader.slice(7);

  if (!token) {
    res.status(401).json({ error: "Expected user access token, not API key" });
    return;
  }

  let payload: { sub: string; azp: string };
  try {
    payload = verifyAppToken(token, app.secretKey) as unknown as { sub: string; azp: string };
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  if (payload.azp !== app.id) {
    res.status(401).json({ error: "Token does not belong to this application" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: payload.sub, applicationId: app.id },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, emailVerified: true, banned: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.banned) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  req.appUser = user;
  next();
}
