import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import type { AppContext } from "../../middleware/apiKey.middleware";

// Secret-key-only endpoints for managing app users server-side.

export async function updateUserMetadata(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const userId = req.params.userId as string;
  const { publicMetadata, privateMetadata } = req.body;

  if (publicMetadata === undefined && privateMetadata === undefined) {
    res.status(422).json({ error: "At least one of publicMetadata or privateMetadata is required" });
    return;
  }

  const existing = await prisma.appUser.findFirst({
    where: { id: userId, applicationId: app.id },
    select: { publicMetadata: true, privateMetadata: true },
  });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const mergedPublic =
    publicMetadata !== undefined
      ? {
          ...(typeof existing.publicMetadata === "object" && existing.publicMetadata !== null
            ? existing.publicMetadata
            : {}),
          ...publicMetadata,
        }
      : undefined;

  const mergedPrivate =
    privateMetadata !== undefined
      ? {
          ...(typeof existing.privateMetadata === "object" && existing.privateMetadata !== null
            ? existing.privateMetadata
            : {}),
          ...privateMetadata,
        }
      : undefined;

  const user = await prisma.appUser.update({
    where: { id: userId },
    data: {
      ...(mergedPublic !== undefined && { publicMetadata: mergedPublic }),
      ...(mergedPrivate !== undefined && { privateMetadata: mergedPrivate }),
    },
    select: { id: true, publicMetadata: true, privateMetadata: true },
  });

  res.json({ user });
}

export async function getUser(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const userId = req.params.userId as string;

  const user = await prisma.appUser.findFirst({
    where: { id: userId, applicationId: app.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      emailVerified: true,
      banned: true,
      publicMetadata: true,
      privateMetadata: true,
      lastSignInAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
}
