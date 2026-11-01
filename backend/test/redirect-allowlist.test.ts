import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createPrismaMock, makeApp, stubWrites, PUBLISHABLE_KEY, SECRET_KEY } from "./helpers";

const prisma = vi.hoisted(() => ({}) as ReturnType<typeof createPrismaMock>);
const email = vi.hoisted(() => ({
  sendAppUserPasswordReset: vi.fn(),
  sendAppUserEmailVerification: vi.fn(),
}));
vi.mock("../src/db/prisma", () => ({ prisma }));
vi.mock("../src/lib/email", () => email);
vi.mock("../src/middleware/rateLimiter", () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return { authLimiter: pass, apiLimiter: pass, otpLimiter: pass };
});

import app from "../src/app";
import { isAllowedRedirect } from "../src/lib/redirect";

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(prisma, createPrismaMock());
  stubWrites(prisma);
  email.sendAppUserPasswordReset.mockResolvedValue(undefined);
  prisma.application.findUnique.mockResolvedValue(makeApp());
});

describe("isAllowedRedirect", () => {
  const origins = ["https://acme.com", "http://localhost:3000"];

  it.each([
    "https://acme.com/auth/callback",
    "https://acme.com/reset-password?x=1",
    "http://localhost:3000/auth/callback",
  ])("allows %s", (url) => {
    expect(isAllowedRedirect(origins, url)).toBe(true);
  });

  it.each([
    "https://evil.com/steal",
    "https://acme.com.evil.com/",          // suffix trick
    "https://evil.com/?https://acme.com",  // allowed origin only in the query
    "https://acme.com@evil.com/",          // userinfo trick
    "http://acme.com/",                    // scheme downgrade is a different origin
    "https://acme.com:8443/",              // different port
    "javascript:alert(1)//https://acme.com",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isAllowedRedirect(origins, url)).toBe(false);
  });

  it("rejects everything when no origins are configured", () => {
    expect(isAllowedRedirect([], "https://acme.com/")).toBe(false);
  });
});

describe("POST /v1/forgot-password", () => {
  const victim = { id: "user_1", applicationId: "app_1", email: "victim@acme.com" };

  function forgot(body: Record<string, unknown>) {
    return request(app).post("/v1/forgot-password").set("x-publishable-key", PUBLISHABLE_KEY).send(body);
  }

  it("refuses to email a reset link pointing at an attacker's site", async () => {
    prisma.appUser.findFirst.mockResolvedValue(victim);

    const res = await forgot({ email: victim.email, redirectUrl: "https://evil.com/reset" });

    expect(res.status).toBe(400);
    expect(prisma.appPasswordReset.create).not.toHaveBeenCalled();
    expect(email.sendAppUserPasswordReset).not.toHaveBeenCalled();
  });

  it("refuses any redirectUrl when the app has no allowed origins", async () => {
    prisma.application.findUnique.mockResolvedValue(makeApp({ allowedOrigins: [] }));
    prisma.appUser.findFirst.mockResolvedValue(victim);

    const res = await forgot({ email: victim.email, redirectUrl: "https://acme.com/reset" });

    expect(res.status).toBe(400);
    expect(email.sendAppUserPasswordReset).not.toHaveBeenCalled();
  });

  it("gives the same rejection whether or not the email exists", async () => {
    prisma.appUser.findFirst.mockResolvedValue(null);

    const res = await forgot({ email: "nobody@acme.com", redirectUrl: "https://evil.com/reset" });

    expect(res.status).toBe(400);
  });

  it("sends the reset link to an allowed origin", async () => {
    prisma.appUser.findFirst.mockResolvedValue(victim);

    const res = await forgot({ email: victim.email, redirectUrl: "https://acme.com/reset" });

    expect(res.status).toBe(200);
    expect(email.sendAppUserPasswordReset).toHaveBeenCalledWith(
      victim.email,
      expect.any(String),
      "Acme",
      "https://acme.com/reset"
    );
  });
});

describe("GET /v1/oauth/:provider", () => {
  beforeEach(() => {
    prisma.oAuthProvider.findUnique.mockResolvedValue({ provider: "google", enabled: true });
  });

  function start(redirectUrl: string) {
    return request(app)
      .get("/v1/oauth/google")
      .query({ publishable_key: PUBLISHABLE_KEY, redirect_url: redirectUrl });
  }

  it("refuses an attacker redirect_url instead of starting the flow", async () => {
    const res = await start("https://evil.com/collect");

    expect(res.status).toBe(403);
    expect(res.headers.location).toBeUndefined();
  });

  it("refuses all redirects when no allowed origins are configured (the default)", async () => {
    prisma.application.findUnique.mockResolvedValue(makeApp({ allowedOrigins: [] }));

    const res = await start("https://evil.com/collect");

    expect(res.status).toBe(403);
    expect(res.headers.location).toBeUndefined();
  });

  it("redirects to the provider for an allowed origin", async () => {
    const res = await start("https://acme.com/auth/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\//);
  });
});

describe("GET /v1/oauth/:provider/callback", () => {
  const user = {
    id: "user_1",
    applicationId: "app_1",
    email: "victim@acme.com",
    firstName: "Vic",
    lastName: "Tim",
    emailVerified: true,
    banned: false,
  };

  function state(redirectUrl: string) {
    return jwt.sign({ publishableKey: PUBLISHABLE_KEY, redirectUrl, nonce: "n" }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "10m",
    });
  }

  function callback(redirectUrl: string) {
    return request(app).get("/v1/oauth/google/callback").query({ code: "provider-code", state: state(redirectUrl) });
  }

  beforeEach(() => {
    prisma.oAuthProvider.findUnique.mockResolvedValue({ provider: "google", enabled: true });
    prisma.oAuthAccount.findUnique.mockResolvedValue({ appUserId: user.id });
    prisma.appUser.findUniqueOrThrow.mockResolvedValue(user);
    prisma.appUserMfa.findUnique.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        json: async () =>
          url.includes("/token")
            ? { access_token: "google-at" }
            : { id: "g-123", email: user.email, given_name: "Vic", family_name: "Tim" },
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns tokens in the URL fragment, never the query string", async () => {
    const res = await callback("https://acme.com/auth/callback");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin).toBe("https://acme.com");
    expect(location.search).toBe("");
    const fragment = new URLSearchParams(location.hash.slice(1));
    const payload = jwt.verify(fragment.get("accessToken")!, SECRET_KEY) as { sub: string };
    expect(payload.sub).toBe(user.id);
    expect(fragment.get("refreshToken")).toBeTruthy();
  });

  it("does not deliver tokens if the origin was removed from the allow-list after the flow started", async () => {
    prisma.application.findUnique.mockResolvedValue(makeApp({ allowedOrigins: [] }));

    const res = await callback("https://acme.com/auth/callback");

    expect(res.status).toBe(400);
    expect(res.headers.location).toBeUndefined();
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });

  it("hands back only an MFA challenge for users with MFA enabled", async () => {
    prisma.appUserMfa.findUnique.mockResolvedValue({ enabled: true });

    const res = await callback("https://acme.com/auth/callback");

    expect(res.status).toBe(302);
    const fragment = new URLSearchParams(new URL(res.headers.location).hash.slice(1));
    expect(fragment.get("mfaToken")).toBeTruthy();
    expect(fragment.get("accessToken")).toBeNull();
    expect(prisma.appSession.create).not.toHaveBeenCalled();
  });
});
