import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { hashPassword, comparePassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateSecureToken, tokenExpiresAt } from "../lib/tokens";
import { sendDeveloperPasswordReset } from "../lib/email";

// Read refresh token from x-refresh-token header
function getRefreshToken(req: Request): string | undefined {
  return req.headers["x-refresh-token"] as string | undefined;
}

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;

  const existing = await prisma.developer.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const developer = await prisma.developer.create({
    data: { email, passwordHash, firstName, lastName },
  });

  const verifyToken = generateSecureToken();
  await prisma.developerEmailVerification.create({
    data: {
      developerId: developer.id,
      token: verifyToken,
      expiresAt: tokenExpiresAt(60),
    },
  });

  const accessToken = signAccessToken({ userId: developer.id, email: developer.email });
  const refreshToken = signRefreshToken({ userId: developer.id, email: developer.email });

  await prisma.developerSession.create({
    data: {
      developerId: developer.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.status(201).json({
    developer: {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
    },
    accessToken,
    refreshToken,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const developer = await prisma.developer.findUnique({ where: { email } });
  if (!developer || !developer.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, developer.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken({ userId: developer.id, email: developer.email });
  const refreshToken = signRefreshToken({ userId: developer.id, email: developer.email });

  await prisma.developerSession.create({
    data: {
      developerId: developer.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    developer: {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
    },
    accessToken,
    refreshToken,
  });
}

export async function refresh(req: Request, res: Response) {
  const token = getRefreshToken(req);
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const session = await prisma.developerSession.findUnique({
    where: { refreshToken: token },
  });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const developer = await prisma.developer.findUnique({
    where: { id: payload.userId },
  });
  if (!developer) {
    res.status(401).json({ error: "Developer not found" });
    return;
  }

  const newAccessToken = signAccessToken({ userId: developer.id, email: developer.email });

  res.json({ accessToken: newAccessToken, refreshToken: token });
}

export async function logout(req: Request, res: Response) {
  const token = getRefreshToken(req);
  if (token) {
    await prisma.developerSession.deleteMany({ where: { refreshToken: token } });
  }
  res.json({ message: "Logged out" });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.params.token as string;

  const record = await prisma.developerEmailVerification.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }

  await prisma.developer.update({
    where: { id: record.developerId },
    data: { emailVerified: true },
  });

  await prisma.developerEmailVerification.delete({ where: { id: record.id } });
  res.json({ message: "Email verified" });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const developer = await prisma.developer.findUnique({ where: { email } });
  // Always return 200 to avoid leaking which emails are registered
  if (!developer) {
    res.json({ message: "If that email exists, a reset link has been sent." });
    return;
  }

  // Invalidate existing tokens
  await prisma.developerPasswordReset.updateMany({
    where: { developerId: developer.id, used: false },
    data: { used: true },
  });

  const token = generateSecureToken();
  await prisma.developerPasswordReset.create({
    data: {
      developerId: developer.id,
      token,
      expiresAt: tokenExpiresAt(60),
    },
  });

  await sendDeveloperPasswordReset(developer.email, token);
  res.json({ message: "If that email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;

  const record = await prisma.developerPasswordReset.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.developer.update({
    where: { id: record.developerId },
    data: { passwordHash },
  });

  await prisma.developerPasswordReset.update({
    where: { id: record.id },
    data: { used: true },
  });

  // Invalidate all sessions so old passwords can't be used
  await prisma.developerSession.deleteMany({ where: { developerId: record.developerId } });

  res.json({ message: "Password reset successfully. Please sign in." });
}

export async function getMe(req: Request, res: Response) {
  const developer = await prisma.developer.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!developer) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ developer });
}
