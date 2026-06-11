import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { generatePublishableKey, generateSecretKey } from "../../lib/keys";

export async function listApplications(req: Request, res: Response) {
  const applications = await prisma.application.findMany({
    where: { developerId: req.user!.userId },
    select: {
      id: true,
      name: true,
      publishableKey: true,
      allowedOrigins: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ applications });
}

export async function createApplication(req: Request, res: Response) {
  const { name, allowedOrigins } = req.body;

  const application = await prisma.application.create({
    data: {
      developerId: req.user!.userId,
      name,
      publishableKey: generatePublishableKey(),
      secretKey: generateSecretKey(),
      allowedOrigins: allowedOrigins ?? [],
    },
    select: {
      id: true,
      name: true,
      publishableKey: true,
      secretKey: true,
      allowedOrigins: true,
      createdAt: true,
    },
  });

  res.status(201).json({ application });
}

export async function getApplication(req: Request, res: Response) {
  const app = await prisma.application.findFirst({
    where: {
      id: req.params.appId as string,
      developerId: req.user!.userId,
    },
    select: {
      id: true,
      name: true,
      publishableKey: true,
      secretKey: true,
      allowedOrigins: true,
      webhookUrl: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true } },
    },
  });

  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json({ application: app });
}

export async function updateApplication(req: Request, res: Response) {
  const exists = await prisma.application.findFirst({
    where: { id: req.params.appId as string, developerId: req.user!.userId },
  });
  if (!exists) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const { name, allowedOrigins, webhookUrl } = req.body;
  const application = await prisma.application.update({
    where: { id: req.params.appId as string },
    data: {
      ...(name !== undefined && { name }),
      ...(allowedOrigins !== undefined && { allowedOrigins }),
      ...(webhookUrl !== undefined && { webhookUrl }),
    },
    select: {
      id: true,
      name: true,
      publishableKey: true,
      allowedOrigins: true,
      webhookUrl: true,
      updatedAt: true,
    },
  });

  res.json({ application });
}

export async function deleteApplication(req: Request, res: Response) {
  const exists = await prisma.application.findFirst({
    where: { id: req.params.appId as string, developerId: req.user!.userId },
  });
  if (!exists) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  await prisma.application.delete({ where: { id: req.params.appId as string } });
  res.json({ message: "Application deleted" });
}

export async function rotateSecretKey(req: Request, res: Response) {
  const exists = await prisma.application.findFirst({
    where: { id: req.params.appId as string, developerId: req.user!.userId },
  });
  if (!exists) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const application = await prisma.application.update({
    where: { id: req.params.appId as string },
    data: { secretKey: generateSecretKey() },
    select: { id: true, secretKey: true },
  });

  res.json({ secretKey: application.secretKey });
}
