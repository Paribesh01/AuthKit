import { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
}

export async function updateMe(req: Request, res: Response) {
  const { firstName, lastName, username } = req.body;

  if (username) {
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: req.user!.userId } },
    });
    if (taken) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { firstName, lastName, username },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      emailVerified: true,
    },
  });

  res.json({ user });
}

export async function getSessions(req: Request, res: Response) {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.userId },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ sessions });
}

export async function revokeSession(req: Request, res: Response) {
  const sessionId = req.params.sessionId as string;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: req.user!.userId },
  });

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await prisma.session.delete({ where: { id: sessionId } });
  res.json({ message: "Session revoked" });
}
