import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({ where: { id: appId, developerId } });
}

export async function listEvents(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;
  const eventType = req.query.eventType as string | undefined;

  const where = {
    applicationId: appId,
    ...(eventType ? { eventType } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.appEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, eventType: true, actorId: true, actorEmail: true,
        ipAddress: true, userAgent: true, metadata: true, createdAt: true,
      },
    }),
    prisma.appEvent.count({ where }),
  ]);

  res.json({ events, total, page, limit });
}

export async function getStats(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeSessions, eventsToday, signInsLast30Days, newUsersLast30Days] = await Promise.all([
    prisma.appUser.count({ where: { applicationId: appId } }),
    prisma.appSession.count({ where: { appUser: { applicationId: appId }, expiresAt: { gt: now } } }),
    prisma.appEvent.count({ where: { applicationId: appId, createdAt: { gte: today } } }),
    prisma.appEvent.count({ where: { applicationId: appId, eventType: "user.signed_in", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.appUser.count({ where: { applicationId: appId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  res.json({ totalUsers, activeSessions, eventsToday, signInsLast30Days, newUsersLast30Days });
}
