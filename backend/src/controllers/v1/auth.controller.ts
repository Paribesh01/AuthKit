import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { hashPassword, comparePassword } from "../../lib/password";
import { signAppAccessToken, signAppRefreshToken, verifyAppToken } from "../../lib/appJwt";
import { generateSecureToken, tokenExpiresAt } from "../../lib/tokens";
import { sendAppUserPasswordReset, sendAppUserEmailVerification } from "../../lib/email";
import { fireWebhook } from "../../lib/webhook";
import { logEvent } from "../../lib/logEvent";
import type { AppContext } from "../../middleware/apiKey.middleware";

const REFRESH_COOKIE = "app_refresh_token";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: `/v1`,
  };
}

function userPayload(user: {
  id: string;
  applicationId: string;
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
}) {
  return {
    sub: user.id,
    azp: user.applicationId,
    email: user.email ?? undefined,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

// Read refresh token from header (SDK) or cookie (browser)
function getRefreshToken(req: Request): string | undefined {
  return (req.headers["x-refresh-token"] as string) || req.cookies[REFRESH_COOKIE] || undefined;
}

export async function signUp(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { email, password, username, firstName, lastName } = req.body;

  if (!email && !username) {
    res.status(422).json({ error: "Email or username is required" });
    return;
  }

  // Fetch app settings for validation
  const settings = await prisma.appSettings.findUnique({ where: { applicationId: app.id } });

  if (settings && !settings.allowSignups) {
    res.status(403).json({ error: "Signups are currently disabled for this application." });
    return;
  }

  if (password && settings) {
    if (password.length < settings.passwordMinLength) {
      res.status(422).json({ error: `Password must be at least ${settings.passwordMinLength} characters.` });
      return;
    }
    if (settings.requireUppercase && !/[A-Z]/.test(password)) {
      res.status(422).json({ error: "Password must contain at least one uppercase letter." });
      return;
    }
    if (settings.requireNumber && !/[0-9]/.test(password)) {
      res.status(422).json({ error: "Password must contain at least one number." });
      return;
    }
  }

  const existing = await prisma.appUser.findFirst({
    where: {
      applicationId: app.id,
      ...(email ? { email } : { username }),
    },
  });
  if (existing) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const passwordHash = password ? await hashPassword(password) : null;

  const user = await prisma.appUser.create({
    data: {
      applicationId: app.id,
      email,
      username,
      firstName,
      lastName,
      passwordHash,
    },
  });

  if (email) {
    const verifyToken = generateSecureToken();
    await prisma.appEmailVerification.create({
      data: {
        appUserId: user.id,
        token: verifyToken,
        expiresAt: tokenExpiresAt(60),
      },
    });
    await sendAppUserEmailVerification(email, verifyToken, app.name).catch(() => {});
  }

  const payload = userPayload(user);
  const accessToken = signAppAccessToken(payload, app.secretKey);
  const refreshToken = signAppRefreshToken(user.id, app.id, app.secretKey);

  await prisma.appSession.create({
    data: {
      appUserId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.appUser.update({
    where: { id: user.id },
    data: { lastSignInAt: new Date() },
  });

  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(app.webhookUrl, app.webhookSecret, "user.created", {
      id: user.id, email: user.email, username: user.username,
      firstName: user.firstName, lastName: user.lastName,
    });
  }
  logEvent({ applicationId: app.id, eventType: "user.created", actorId: user.id, actorEmail: user.email, ipAddress: req.ip, userAgent: req.headers["user-agent"] as string });

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  });
}

export async function signIn(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { email, username, password } = req.body;

  const user = await prisma.appUser.findFirst({
    where: {
      applicationId: app.id,
      ...(email ? { email } : { username }),
    },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.banned) {
    res.status(403).json({ error: "This account has been banned" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Fetch settings for session duration + max sessions enforcement
  const settings = await prisma.appSettings.findUnique({ where: { applicationId: app.id } });
  const sessionHours = settings?.sessionDurationHours ?? 168;
  const maxSessions = settings?.maxSessionsPerUser ?? 5;

  const payload = userPayload(user);
  const accessToken = signAppAccessToken(payload, app.secretKey);
  const refreshToken = signAppRefreshToken(user.id, app.id, app.secretKey);

  await prisma.appSession.create({
    data: {
      appUserId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + sessionHours * 60 * 60 * 1000),
    },
  });

  // Prune oldest sessions if over limit
  const allSessions = await prisma.appSession.findMany({
    where: { appUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (allSessions.length > maxSessions) {
    const toDelete = allSessions.slice(0, allSessions.length - maxSessions).map(s => s.id);
    await prisma.appSession.deleteMany({ where: { id: { in: toDelete } } });
  }

  await prisma.appUser.update({
    where: { id: user.id },
    data: { lastSignInAt: new Date() },
  });

  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(app.webhookUrl, app.webhookSecret, "user.signed_in", {
      id: user.id, email: user.email, username: user.username,
    });
  }
  logEvent({ applicationId: app.id, eventType: "user.signed_in", actorId: user.id, actorEmail: user.email, ipAddress: req.ip, userAgent: req.headers["user-agent"] as string });

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  });
}

export async function refreshSession(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const token = getRefreshToken(req);

  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  let decoded: { sub: string; azp: string };
  try {
    decoded = verifyAppToken(token, app.secretKey) as unknown as {
      sub: string;
      azp: string;
    };
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  if (decoded.azp !== app.id) {
    res.status(401).json({ error: "Token does not belong to this application" });
    return;
  }

  const session = await prisma.appSession.findUnique({
    where: { refreshToken: token },
    include: { appUser: true },
  });

  if (!session || session.expiresAt < new Date()) {
    res.clearCookie(REFRESH_COOKIE);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  if (session.appUser.banned) {
    res.status(403).json({ error: "This account has been banned" });
    return;
  }

  // No rotation — return the same refresh token so concurrent/sequential
  // calls don't invalidate each other (React StrictMode, etc.)
  const newAccessToken = signAppAccessToken(
    userPayload(session.appUser),
    app.secretKey
  );

  res.json({ accessToken: newAccessToken, refreshToken: token });
}

export async function signOut(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const token = getRefreshToken(req);

  if (token) {
    try {
      verifyAppToken(token, app.secretKey);
      await prisma.appSession.deleteMany({ where: { refreshToken: token } });
    } catch {
      // Token invalid — still clear
    }
  }

  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: "Signed out" });
}

export async function getMe(req: Request, res: Response) {
  const app = req.application! as AppContext;

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }

  const token = authHeader.slice(7);
  let payload: { sub: string; azp: string };
  try {
    payload = verifyAppToken(token, app.secretKey) as unknown as {
      sub: string;
      azp: string;
    };
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  if (payload.azp !== app.id) {
    res.status(401).json({ error: "Token does not belong to this application" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: payload.sub, applicationId: app.id },
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
      lastSignInAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.banned) {
    res.status(403).json({ error: "This account has been banned" });
    return;
  }

  res.json({ user });
}

export async function updateMyMetadata(req: Request, res: Response) {
  const app = req.application! as AppContext;

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }

  let payload: { sub: string; azp: string };
  try {
    payload = verifyAppToken(authHeader.slice(7), app.secretKey) as unknown as { sub: string; azp: string };
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  if (payload.azp !== app.id) {
    res.status(401).json({ error: "Token does not belong to this application" });
    return;
  }

  const { publicMetadata } = req.body;
  if (publicMetadata === undefined) {
    res.status(422).json({ error: "publicMetadata is required" });
    return;
  }

  const existing = await prisma.appUser.findFirst({
    where: { id: payload.sub, applicationId: app.id },
    select: { publicMetadata: true },
  });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const merged = {
    ...(typeof existing.publicMetadata === "object" && existing.publicMetadata !== null
      ? existing.publicMetadata
      : {}),
    ...publicMetadata,
  };

  const user = await prisma.appUser.update({
    where: { id: payload.sub },
    data: { publicMetadata: merged },
    select: { id: true, publicMetadata: true },
  });

  res.json({ user });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.params.token as string;
  const record = await prisma.appEmailVerification.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    res.status(400).send("<p>Invalid or expired verification link.</p>");
    return;
  }
  await prisma.appUser.update({
    where: { id: record.appUserId },
    data: { emailVerified: true },
  });
  await prisma.appEmailVerification.delete({ where: { id: record.id } });
  res.send("<p>Email verified! You can close this tab.</p>");
}

export async function forgotPassword(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { email, redirectUrl } = req.body;

  const user = await prisma.appUser.findFirst({
    where: { applicationId: app.id, email },
  });

  if (!user || !email) {
    res.json({ message: "If that email exists, a reset link has been sent." });
    return;
  }

  await prisma.appPasswordReset.updateMany({
    where: { appUserId: user.id, used: false },
    data: { used: true },
  });

  const token = generateSecureToken();
  await prisma.appPasswordReset.create({
    data: { appUserId: user.id, token, expiresAt: tokenExpiresAt(60) },
  });

  const callbackUrl = redirectUrl || `${process.env.CLIENT_URL}/reset-password`;
  await sendAppUserPasswordReset(email, token, app.name, callbackUrl).catch(() => {});
  res.json({ message: "If that email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { token, password } = req.body;

  const record = await prisma.appPasswordReset.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  const user = await prisma.appUser.findFirst({
    where: { id: record.appUserId, applicationId: app.id },
  });
  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.appUser.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.appPasswordReset.update({ where: { id: record.id }, data: { used: true } });
  await prisma.appSession.deleteMany({ where: { appUserId: user.id } });

  res.json({ message: "Password reset successfully. Please sign in." });
}

// Backend-only endpoint: verify a token without needing the user's browser
// Developer calls this server-side with their secret key
export async function verifyToken(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { token } = req.body;

  if (!token) {
    res.status(422).json({ error: "token is required" });
    return;
  }

  try {
    const payload = verifyAppToken(token, app.secretKey);
    res.json({ valid: true, payload });
  } catch {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
}
