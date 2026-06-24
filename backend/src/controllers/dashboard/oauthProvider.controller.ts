import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({ where: { id: appId, developerId } });
}

const SUPPORTED_PROVIDERS = ["google", "github"] as const;

export async function listOAuthProviders(req: Request, res: Response) {
  const app = await getOwnedApp(req.user!.userId, req.params.appId as string);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const records = await prisma.oAuthProvider.findMany({
    where: { applicationId: app.id },
    select: { id: true, provider: true, enabled: true, createdAt: true },
    orderBy: { provider: "asc" },
  });

  // Return all supported providers with enabled state
  const map = new Map(records.map(r => [r.provider, r]));
  const providers = SUPPORTED_PROVIDERS.map(p => ({
    provider: p,
    enabled: map.get(p)?.enabled ?? false,
    id: map.get(p)?.id ?? null,
  }));

  res.json({ providers });
}

export async function upsertOAuthProvider(req: Request, res: Response) {
  const app = await getOwnedApp(req.user!.userId, req.params.appId as string);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const { provider, enabled } = req.body as { provider: string; enabled: boolean };
  if (!SUPPORTED_PROVIDERS.includes(provider as typeof SUPPORTED_PROVIDERS[number])) {
    res.status(400).json({ error: "Unsupported provider" }); return;
  }

  const record = await prisma.oAuthProvider.upsert({
    where: { applicationId_provider: { applicationId: app.id, provider } },
    create: { applicationId: app.id, provider, enabled: enabled ?? true },
    update: { enabled: enabled ?? true },
    select: { id: true, provider: true, enabled: true, updatedAt: true },
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
