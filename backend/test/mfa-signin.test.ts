import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TOTP } from "otpauth";
import { createPrismaMock, makeApp, stubWrites, PUBLISHABLE_KEY, SECRET_KEY } from "./helpers";

const prisma = vi.hoisted(() => ({}) as ReturnType<typeof createPrismaMock>);
vi.mock("../src/db/prisma", () => ({ prisma }));
vi.mock("../src/lib/email", () => ({
  sendAppUserPasswordReset: vi.fn().mockResolvedValue(undefined),
  sendAppUserEmailVerification: vi.fn().mockResolvedValue(undefined),
}));
// Every test hits the same endpoints from the same IP; the limiter isn't under test here.
vi.mock("../src/middleware/rateLimiter", () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return { authLimiter: pass, apiLimiter: pass, otpLimiter: pass };
});

import app from "../src/app";
import { signMfaChallengeToken } from "../src/lib/appJwt";

const PASSWORD = "correct-horse-battery";
const TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const BACKUP_CODE = "a1b2c3d4e5";

const user = {
  id: "user_1",
  applicationId: "app_1",
  email: "victim@acme.com",
  username: null,
  firstName: "Vic",
  lastName: "Tim",
  emailVerified: true,
  banned: false,
  passwordHash: bcrypt.hashSync(PASSWORD, 4),
};

function currentTotp() {
  return new TOTP({ secret: TOTP_SECRET, digits: 6, period: 30, algorithm: "SHA1" }).generate();
}

function signIn() {
  return request(app)
    .post("/v1/sign-in")
    .set("x-publishable-key", PUBLISHABLE_KEY)
    .send({ email: user.email, password: PASSWORD });
}

function verifyMfa(body: Record<string, unknown>) {
  return request(app).post("/v1/mfa/verify").set("x-publishable-key", PUBLISHABLE_KEY).send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(prisma, createPrismaMock());
  stubWrites(prisma);
  prisma.application.findUnique.mockResolvedValue(makeApp());
  prisma.appUser.findFirst.mockResolvedValue(user);
  prisma.appUserMfa.findUnique.mockResolvedValue({
    appUserId: user.id,
    enabled: true,
    secret: TOTP_SECRET,
    backupCodes: [bcrypt.hashSync(BACKUP_CODE, 4)],
  });
});

describe("sign-in for a user with MFA enabled", () => {
  it("does not issue a session from the password alone", async () => {
    const res = await signIn();

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(typeof res.body.mfaToken).toBe("string");
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });

  it("does not accept the MFA challenge token as an access token", async () => {
    const { body } = await signIn();

    const me = await request(app)
      .get("/v1/me")
      .set("x-publishable-key", PUBLISHABLE_KEY)
      .set("Authorization", `Bearer ${body.mfaToken}`);
    expect(me.status).toBe(401);

    // Developers verify tokens with the raw secret key (SDK authMiddleware) — that must fail too.
    expect(() => jwt.verify(body.mfaToken, SECRET_KEY)).toThrow();
  });

  it("issues a session once a valid TOTP code is supplied with the challenge token", async () => {
    const { body } = await signIn();

    const res = await verifyMfa({ mfaToken: body.mfaToken, code: currentTotp() });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    const payload = jwt.verify(res.body.accessToken, SECRET_KEY) as { sub: string; azp: string };
    expect(payload).toMatchObject({ sub: user.id, azp: "app_1" });
    expect(prisma.appSession.create).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong code without issuing a session", async () => {
    const { body } = await signIn();
    const wrong = currentTotp() === "000000" ? "111111" : "000000";

    const res = await verifyMfa({ mfaToken: body.mfaToken, code: wrong });

    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });

  it("accepts a backup code once, consuming it", async () => {
    const { body } = await signIn();

    const res = await verifyMfa({ mfaToken: body.mfaToken, code: BACKUP_CODE });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(prisma.appUserMfa.update).toHaveBeenCalledWith({
      where: { appUserId: user.id },
      data: { backupCodes: [] },
    });
  });

  it("ignores a client-supplied userId — the old unauthenticated shape is rejected", async () => {
    const res = await verifyMfa({ userId: user.id, applicationId: "app_1", code: currentTotp() });

    expect(res.status).toBe(422);
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });

  it("rejects a challenge token minted for a different application", async () => {
    const otherAppToken = signMfaChallengeToken(user.id, "app_2", "sk_live_" + "c".repeat(64));

    const res = await verifyMfa({ mfaToken: otherAppToken, code: currentTotp() });

    expect(res.status).toBe(401);
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });

  it("rejects an expired challenge token", async () => {
    const expired = jwt.sign(
      { sub: user.id, azp: "app_1", typ: "mfa_challenge", exp: Math.floor(Date.now() / 1000) - 10 },
      `${SECRET_KEY}:mfa_challenge`
    );

    const res = await verifyMfa({ mfaToken: expired, code: currentTotp() });

    expect(res.status).toBe(401);
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });
});

describe("sign-in for a user without MFA", () => {
  it("still issues a session directly", async () => {
    prisma.appUserMfa.findUnique.mockResolvedValue(null);

    const res = await signIn();

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBeUndefined();
    expect(res.body.accessToken).toBeDefined();
    expect(prisma.appSession.create).toHaveBeenCalledTimes(1);
  });
});
