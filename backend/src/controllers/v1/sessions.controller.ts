import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { verifyAppToken } from "../../lib/appJwt";
import type { AppContext } from "../../middleware/apiKey.middleware";

const REFRESH_COOKIE = "app_refresh_token";

function getTokens(req: Request) {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const refreshToken =
    (req.headers["x-refresh-token"] as string) || req.cookies[REFRESH_COOKIE] || null;
  return { accessToken, refreshToken };
}

function requireUser(req: Request, app: AppContext): { sub: string } | null {
  const { accessToken } = getTokens(req);
  if (!accessToken) return null;
  try {
    const payload = verifyAppToken(accessToken, app.secretKey) as unknown as {
      sub: string;
      azp: string;
    };
    if (payload.azp !== app.id) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

// GET /v1/me/sessions
export async function listSessions(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const auth = requireUser(req, app);
  if (!auth) {
    res.status(401).json({ error: "Missing or invalid access token" });
    return;
  }

  const { refreshToken: currentRT } = getTokens(req);

  const sessions = await prisma.appSession.findMany({
    where: { appUserId: auth.sub, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: currentRT ? session.refreshToken === currentRT : false,
    })),
  });
}

// DELETE /v1/me/sessions/:sessionId
export async function revokeSession(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const auth = requireUser(req, app);
  if (!auth) {
    res.status(401).json({ error: "Missing or invalid access token" });
    return;
  }

  const sessionId = req.params.sessionId as string;

  const session = await prisma.appSession.findFirst({
    where: { id: sessionId, appUserId: auth.sub },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await prisma.appSession.delete({ where: { id: sessionId } });
  res.json({ message: "Session revoked" });
}

// DELETE /v1/me/sessions  (revoke all — sign out everywhere)
export async function revokeAllSessions(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const auth = requireUser(req, app);
  if (!auth) {
    res.status(401).json({ error: "Missing or invalid access token" });
    return;
  }

  await prisma.appSession.deleteMany({ where: { appUserId: auth.sub } });
  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: "All sessions revoked" });
}
