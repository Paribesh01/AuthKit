import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { fireWebhook } from "../../lib/webhook";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({
    where: { id: appId, developerId },
  });
}

export async function listUsers(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.appUser.findMany({
      where: { applicationId: appId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        banned: true,
        lastSignInAt: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.appUser.count({ where: { applicationId: appId } }),
  ]);

  res.json({ users, total, page, limit });
}

export async function getUser(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      emailVerified: true,
      banned: true,
      lastSignInAt: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
}

export async function banUser(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = await prisma.appUser.update({
    where: { id: user.id },
    data: { banned: true },
    select: { id: true, banned: true },
  });

  await prisma.appSession.deleteMany({ where: { appUserId: user.id } });

  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(app.webhookUrl, app.webhookSecret, "user.banned", { id: user.id, email: user.email });
  }

  res.json({ user: updated });
}

export async function unbanUser(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = await prisma.appUser.update({
    where: { id: user.id },
    data: { banned: false },
    select: { id: true, banned: true },
  });

  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(app.webhookUrl, app.webhookSecret, "user.unbanned", { id: user.id, email: user.email });
  }

  res.json({ user: updated });
}

export async function deleteUser(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.appUser.delete({ where: { id: user.id } });

  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(app.webhookUrl, app.webhookSecret, "user.deleted", { id: user.id, email: user.email });
  }

  res.json({ message: "User deleted" });
}

export async function updateUserMetadata(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
    select: { publicMetadata: true, privateMetadata: true },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { publicMetadata, privateMetadata } = req.body;

  const merge = (existing: unknown, incoming: unknown) => ({
    ...(typeof existing === "object" && existing !== null ? existing : {}),
    ...(typeof incoming === "object" && incoming !== null ? incoming : {}),
  });

  const updated = await prisma.appUser.update({
    where: { id: req.params.userId as string },
    data: {
      ...(publicMetadata !== undefined && { publicMetadata: merge(user.publicMetadata, publicMetadata) }),
      ...(privateMetadata !== undefined && { privateMetadata: merge(user.privateMetadata, privateMetadata) }),
    },
    select: { id: true, publicMetadata: true, privateMetadata: true },
  });

  res.json({ user: updated });
}

export async function revokeUserSessions(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: req.params.userId as string, applicationId: appId },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.appSession.deleteMany({ where: { appUserId: user.id } });
  res.json({ message: "All sessions revoked" });
}
