import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { hashPassword, comparePassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateSecureToken, tokenExpiresAt } from "../lib/tokens";

const REFRESH_COOKIE = "dev_refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

  // TODO: send verification email

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

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  res.status(201).json({
    developer: {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
    },
    accessToken,
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

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  res.json({
    developer: {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
    },
    accessToken,
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
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
    res.clearCookie(REFRESH_COOKIE);
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

  const newRefreshToken = signRefreshToken({ userId: developer.id, email: developer.email });
  const newAccessToken = signAccessToken({ userId: developer.id, email: developer.email });

  await prisma.developerSession.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: newAccessToken });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    await prisma.developerSession.deleteMany({ where: { refreshToken: token } });
  }
  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: "Logged out" });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.params.token as string;

  const record = await prisma.developerEmailVerification.findUnique({
    where: { token },
  });
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
