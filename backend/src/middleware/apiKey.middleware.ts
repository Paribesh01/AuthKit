import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export interface AppContext {
  id: string;
  name: string;
  developerId: string;
  publishableKey: string;
  secretKey: string;
  allowedOrigins: string[];
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      application?: AppContext;
    }
  }
}

export async function requirePublishableKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key =
    (req.headers["x-publishable-key"] as string) ||
    (req.headers.authorization?.startsWith("Bearer pk_live_")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!key) {
    res.status(401).json({ error: "Missing publishable key" });
    return;
  }

  const application = await prisma.application.findUnique({
    where: { publishableKey: key },
  });

  if (!application) {
    res.status(401).json({ error: "Invalid publishable key" });
    return;
  }

  req.application = application as AppContext;
  next();
}

export async function requireSecretKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer sk_live_")) {
    res.status(401).json({ error: "Missing or invalid secret key" });
    return;
  }

  const key = authHeader.slice(7);
  const application = await prisma.application.findUnique({
    where: { secretKey: key },
  });

  if (!application) {
    res.status(401).json({ error: "Invalid secret key" });
    return;
  }

  req.application = application as AppContext;
  next();
}
