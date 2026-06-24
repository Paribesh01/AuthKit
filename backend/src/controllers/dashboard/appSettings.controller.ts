import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

async function getOwnedApp(developerId: string, appId: string) {
  return prisma.application.findFirst({ where: { id: appId, developerId } });
}

export async function getSettings(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const settings = await prisma.appSettings.upsert({
    where: { applicationId: appId },
    create: { applicationId: appId },
    update: {},
  });

  res.json({ settings });
}

export async function updateSettings(req: Request, res: Response) {
  const appId = req.params.appId as string;
  const app = await getOwnedApp(req.user!.userId, appId);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const {
    passwordMinLength, requireUppercase, requireNumber,
    requireEmailVerification, allowSignups, sessionDurationHours, maxSessionsPerUser,
  } = req.body;

  const settings = await prisma.appSettings.upsert({
    where: { applicationId: appId },
    create: {
      applicationId: appId,
      ...(passwordMinLength !== undefined && { passwordMinLength }),
      ...(requireUppercase !== undefined && { requireUppercase }),
      ...(requireNumber !== undefined && { requireNumber }),
      ...(requireEmailVerification !== undefined && { requireEmailVerification }),
      ...(allowSignups !== undefined && { allowSignups }),
      ...(sessionDurationHours !== undefined && { sessionDurationHours }),
      ...(maxSessionsPerUser !== undefined && { maxSessionsPerUser }),
    },
    update: {
      ...(passwordMinLength !== undefined && { passwordMinLength }),
      ...(requireUppercase !== undefined && { requireUppercase }),
      ...(requireNumber !== undefined && { requireNumber }),
      ...(requireEmailVerification !== undefined && { requireEmailVerification }),
      ...(allowSignups !== undefined && { allowSignups }),
      ...(sessionDurationHours !== undefined && { sessionDurationHours }),
      ...(maxSessionsPerUser !== undefined && { maxSessionsPerUser }),
    },
  });

  res.json({ settings });
}
