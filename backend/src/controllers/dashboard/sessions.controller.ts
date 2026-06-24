import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({ where: { id: appId, developerId } });
}

export async function listUserSessions(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const sessions = await prisma.appSession.findMany({
    where: { appUserId: user.id as string },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
  });

  res.json({ sessions });
}

export async function revokeSession(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  // Verify session belongs to this app
  const session = await prisma.appSession.findFirst({
    where: { id: req.params.sessionId as string, appUser: { applicationId: appId } },
  });
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  await prisma.appSession.delete({ where: { id: session.id } });
  res.json({ message: "Session revoked" });
}

export async function getActivityChart(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  // Last 7 days of sign-in events, grouped by day
  const days = 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.appEvent.findMany({
    where: { applicationId: appId, eventType: "user.signed_in", createdAt: { gte: since } },
    select: { createdAt: true },
  });

  // Build day buckets
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (key in buckets) buckets[key]++;
  }

  const chart = Object.entries(buckets).map(([date, count]) => ({ date, count }));
  res.json({ chart });
}
