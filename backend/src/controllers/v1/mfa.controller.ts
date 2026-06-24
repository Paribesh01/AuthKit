import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TOTP } = require("otpauth") as { TOTP: new (opts: Record<string, unknown>) => { toString(): string; validate(opts: { token: string; window: number }): number | null } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require("qrcode") as { toDataURL(text: string): Promise<string> };
import crypto from "crypto";
import { hashPassword, comparePassword } from "../../lib/password";

function newTotpSecret(): string {
  return crypto.randomBytes(20).toString("base64").replace(/[^A-Z2-7]/gi, "A").toUpperCase().slice(0, 32);
}

function makeTOTP(secret: string, email: string, appName: string) {
  return new TOTP({ issuer: appName, label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
}

export async function setupMfa(req: Request, res: Response) {
  const userId = req.appUser!.id;
  const appName = req.application!.name;

  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const secret = newTotpSecret();
  await prisma.appUserMfa.upsert({
    where: { appUserId: userId },
    create: { appUserId: userId, secret, enabled: false },
    update: { secret, enabled: false }, // reset if re-setup
  });

  const totp = makeTOTP(secret, user.email ?? userId, appName);
  const otpauthUrl = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, otpauthUrl, qrDataUrl });
}

export async function verifyMfaSetup(req: Request, res: Response) {
  const userId = req.appUser!.id;
  const { code } = req.body;
  if (!code) { res.status(422).json({ error: "Code required" }); return; }

  const mfa = await prisma.appUserMfa.findUnique({ where: { appUserId: userId } });
  if (!mfa) { res.status(400).json({ error: "MFA not set up" }); return; }

  const appName = req.application!.name;
  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { email: true } });
  const totp = makeTOTP(mfa.secret, user?.email ?? userId, appName);

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) { res.status(400).json({ error: "Invalid code" }); return; }

  // Generate 8 backup codes
  const rawCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString("hex"));
  const hashedCodes = await Promise.all(rawCodes.map(c => hashPassword(c)));

  await prisma.appUserMfa.update({
    where: { appUserId: userId },
    data: { enabled: true, backupCodes: hashedCodes },
  });

  res.json({ enabled: true, backupCodes: rawCodes });
}

export async function disableMfa(req: Request, res: Response) {
  const userId = req.appUser!.id;
  const { code } = req.body;
  if (!code) { res.status(422).json({ error: "Code required" }); return; }

  const mfa = await prisma.appUserMfa.findUnique({ where: { appUserId: userId } });
  if (!mfa || !mfa.enabled) { res.status(400).json({ error: "MFA not enabled" }); return; }

  const appName = req.application!.name;
  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { email: true } });
  const totp = makeTOTP(mfa.secret, user?.email ?? userId, appName);
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) { res.status(400).json({ error: "Invalid code" }); return; }

  await prisma.appUserMfa.update({ where: { appUserId: userId }, data: { enabled: false, backupCodes: [] } });
  res.json({ disabled: true });
}

export async function getMfaStatus(req: Request, res: Response) {
  const mfa = await prisma.appUserMfa.findUnique({
    where: { appUserId: req.appUser!.id },
    select: { enabled: true },
  });
  res.json({ enabled: mfa?.enabled ?? false });
}

// Called during sign-in flow when MFA is required
export async function verifyMfaCode(req: Request, res: Response) {
  const { userId, code, applicationId } = req.body as { userId: string; code: string; applicationId: string };
  if (!userId || !code) { res.status(422).json({ error: "userId and code required" }); return; }

  const mfa = await prisma.appUserMfa.findUnique({ where: { appUserId: userId } });
  if (!mfa || !mfa.enabled) { res.status(400).json({ error: "MFA not enabled" }); return; }

  const app = await prisma.application.findUnique({ where: { id: applicationId }, select: { name: true } });
  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { email: true } });
  const totp = makeTOTP(mfa.secret, user?.email ?? userId, app?.name ?? "App");

  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) { res.json({ valid: true }); return; }

  // Try backup codes
  for (let i = 0; i < mfa.backupCodes.length; i++) {
    if (await comparePassword(code, mfa.backupCodes[i])) {
      // Consume backup code
      const remaining = [...mfa.backupCodes];
      remaining.splice(i, 1);
      await prisma.appUserMfa.update({ where: { appUserId: userId }, data: { backupCodes: remaining } });
      res.json({ valid: true, usedBackupCode: true, remaining: remaining.length });
      return;
    }
  }

  res.status(400).json({ valid: false, error: "Invalid MFA code" });
}
