import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { hashPassword, comparePassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateSecureToken, tokenExpiresAt } from "../lib/tokens";

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
  });

  // Create email verification token
  const verifyToken = generateSecureToken();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      token: verifyToken,
      expiresAt: tokenExpiresAt(60), // 1 hour
    },
  });

  // TODO: send verification email

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
    accessToken,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
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

  const session = await prisma.session.findUnique({ where: { refreshToken: token } });
  if (!session || session.expiresAt < new Date()) {
    res.clearCookie(REFRESH_COOKIE);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Rotate refresh token
  const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });
  const newAccessToken = signAccessToken({ userId: user.id, email: user.email });

  await prisma.session.update({
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
    await prisma.session.deleteMany({ where: { refreshToken: token } });
  }
  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: "Logged out" });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.params.token as string;

  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });

  await prisma.emailVerification.delete({ where: { id: record.id } });

  res.json({ message: "Email verified successfully" });
}
