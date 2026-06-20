import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({ where: { id: appId, developerId } });
}

export async function listOAuthProviders(req: Request, res: Response) {
  const app = await getOwnedApp(req.user!.userId, req.params.appId as string);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const providers = await prisma.oAuthProvider.findMany({
    where: { applicationId: app.id },
    select: { id: true, provider: true, clientId: true, enabled: true, createdAt: true },
    orderBy: { provider: "asc" },
  });

  res.json({ providers });
}

export async function upsertOAuthProvider(req: Request, res: Response) {
  const app = await getOwnedApp(req.user!.userId, req.params.appId as string);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const { provider, clientId, clientSecret, enabled = true } = req.body;

  const record = await prisma.oAuthProvider.upsert({
    where: { applicationId_provider: { applicationId: app.id, provider } },
    create: { applicationId: app.id, provider, clientId, clientSecret, enabled },
    update: {
      ...(clientId !== undefined && { clientId }),
      ...(clientSecret !== undefined && { clientSecret }),
      ...(enabled !== undefined && { enabled }),
    },
    select: { id: true, provider: true, clientId: true, enabled: true, updatedAt: true },
  });

  res.json({ provider: record });
}

export async function deleteOAuthProvider(req: Request, res: Response) {
  const app = await getOwnedApp(req.user!.userId, req.params.appId as string);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const existing = await prisma.oAuthProvider.findUnique({
    where: { applicationId_provider: { applicationId: app.id, provider: req.params.provider as string } },
  });
  if (!existing) { res.status(404).json({ error: "Provider not configured" }); return; }

  await prisma.oAuthProvider.delete({ where: { id: existing.id } });
  res.json({ message: "OAuth provider removed" });
}
