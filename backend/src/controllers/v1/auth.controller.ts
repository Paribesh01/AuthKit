import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { hashPassword, comparePassword } from "../../lib/password";
import { signAppAccessToken, signAppRefreshToken, verifyAppToken } from "../../lib/appJwt";
import { generateSecureToken, tokenExpiresAt } from "../../lib/tokens";
import type { AppContext } from "../../middleware/apiKey.middleware";

const REFRESH_COOKIE = "app_refresh_token";

function cookieOptions(appId: string) {
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

export async function signUp(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const { email, password, username, firstName, lastName } = req.body;

  if (!email && !username) {
    res.status(422).json({ error: "Email or username is required" });
    return;
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
    // TODO: send verification email via developer's webhook or our email service
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

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(app.id));
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

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(app.id));
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
  });
}

export async function refreshSession(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const token = req.cookies[REFRESH_COOKIE];

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

  const newRefreshToken = signAppRefreshToken(
    session.appUser.id,
    app.id,
    app.secretKey
  );
  const newAccessToken = signAppAccessToken(
    userPayload(session.appUser),
    app.secretKey
  );

  await prisma.appSession.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie(REFRESH_COOKIE, newRefreshToken, cookieOptions(app.id));
  res.json({ accessToken: newAccessToken });
}

export async function signOut(req: Request, res: Response) {
  const app = req.application! as AppContext;
  const token = req.cookies[REFRESH_COOKIE];

  if (token) {
    try {
      verifyAppToken(token, app.secretKey);
      await prisma.appSession.deleteMany({ where: { refreshToken: token } });
    } catch {
      // Token invalid — still clear the cookie
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
  } catch (err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
}
