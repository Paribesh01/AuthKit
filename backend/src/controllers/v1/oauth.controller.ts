import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { signAppAccessToken, signAppRefreshToken } from "../../lib/appJwt";
import { fireWebhook } from "../../lib/webhook";

const API_URL = process.env.API_URL || "http://localhost:4000";

const PLATFORM_CREDENTIALS: Record<string, { clientId: string; clientSecret: string }> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
};

const PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    emailUrl: "https://api.github.com/user/emails",
    scope: "user:email",
  },
} as const;

type Provider = keyof typeof PROVIDERS;

function callbackUrl(provider: string) {
  return `${API_URL}/v1/oauth/${provider}/callback`;
}

function stateSecret() {
  return process.env.JWT_REFRESH_SECRET!;
}

// ── GET /v1/oauth/providers ──────────────────────────────────────────────────

export async function getEnabledProviders(req: Request, res: Response) {
  const application = (req as Request & { application?: { id: string } }).application;
  if (!application) {
    res.status(401).json({ error: "Invalid publishable key" });
    return;
  }

  const rows = await prisma.oAuthProvider.findMany({
    where: { applicationId: application.id, enabled: true },
    select: { provider: true },
  });

  res.json({ providers: rows.map((r) => r.provider) });
}

// ── GET /v1/oauth/:provider ──────────────────────────────────────────────────

export async function initiateOAuth(req: Request, res: Response) {
  const provider = req.params.provider as Provider;
  if (!PROVIDERS[provider]) {
    res.status(400).json({ error: `Unsupported provider: ${provider}` });
    return;
  }

  const publishableKey = req.query.publishable_key as string;
  const redirectUrl = req.query.redirect_url as string;

  if (!publishableKey || !redirectUrl) {
    res.status(400).json({ error: "publishable_key and redirect_url are required" });
    return;
  }

  const app = await prisma.application.findUnique({ where: { publishableKey } });
  if (!app) {
    res.status(401).json({ error: "Invalid publishable key" });
    return;
  }

  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { applicationId_provider: { applicationId: app.id, provider } },
  });
  if (!oauthProvider?.enabled) {
    res.status(400).json({ error: `${provider} sign-in is not enabled for this application` });
    return;
  }

  const creds = PLATFORM_CREDENTIALS[provider];
  if (!creds?.clientId) {
    res.status(503).json({ error: `${provider} OAuth is not configured on this AuthKit instance` });
    return;
  }

  const state = jwt.sign(
    { publishableKey, redirectUrl, nonce: Math.random().toString(36).slice(2) },
    stateSecret(),
    { expiresIn: "10m" } as jwt.SignOptions
  );

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    scope: PROVIDERS[provider].scope,
    state,
  });

  res.redirect(`${PROVIDERS[provider].authUrl}?${params.toString()}`);
}

// ── GET /v1/oauth/:provider/callback ────────────────────────────────────────

export async function oauthCallback(req: Request, res: Response) {
  const provider = req.params.provider as Provider;
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.status(400).send(`<p>OAuth error: ${oauthError}</p>`);
    return;
  }

  if (!code || !state) {
    res.status(400).send("<p>Missing code or state</p>");
    return;
  }

  // Verify state
  let statePayload: { publishableKey: string; redirectUrl: string };
  try {
    statePayload = jwt.verify(state as string, stateSecret()) as typeof statePayload;
  } catch {
    res.status(400).send("<p>Invalid or expired OAuth state. Please try again.</p>");
    return;
  }

  const app = await prisma.application.findUnique({
    where: { publishableKey: statePayload.publishableKey },
  });
  if (!app) {
    res.status(400).send("<p>Application not found</p>");
    return;
  }

  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { applicationId_provider: { applicationId: app.id, provider } },
  });
  if (!oauthProvider?.enabled) {
    res.status(400).send("<p>OAuth provider not enabled for this application</p>");
    return;
  }

  const creds = PLATFORM_CREDENTIALS[provider];
  if (!creds?.clientId) {
    res.status(503).send(`<p>${provider} OAuth is not configured on this AuthKit instance</p>`);
    return;
  }

  // Exchange code for provider access token
  let providerAccessToken: string;
  try {
    const isGithub = provider === "github";
    const tokenRes = await fetch(PROVIDERS[provider].tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: callbackUrl(provider),
        ...(isGithub ? {} : { grant_type: "authorization_code" }),
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) throw new Error(tokenData.error || "No access token");
    providerAccessToken = tokenData.access_token;
  } catch (err) {
    res.status(500).send(`<p>Failed to exchange code: ${(err as Error).message}</p>`);
    return;
  }

  // Fetch user info from provider
  let providerId: string;
  let email: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  let imageUrl: string | null = null;

  try {
    const userRes = await fetch(PROVIDERS[provider].userUrl, {
      headers: { Authorization: `Bearer ${providerAccessToken}`, "User-Agent": "authkit/1.0" },
    });
    const userInfo = (await userRes.json()) as Record<string, unknown>;

    if (provider === "google") {
      providerId = String(userInfo.id);
      email = (userInfo.email as string) || null;
      firstName = (userInfo.given_name as string) || null;
      lastName = (userInfo.family_name as string) || null;
      imageUrl = (userInfo.picture as string) || null;
    } else {
      // GitHub
      providerId = String(userInfo.id);
      email = (userInfo.email as string) || null;
      const name = ((userInfo.name as string) || "").trim();
      const parts = name.split(" ");
      firstName = parts[0] || null;
      lastName = parts.slice(1).join(" ") || null;
      imageUrl = (userInfo.avatar_url as string) || null;

      // GitHub may not expose email publicly — fetch it separately
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${providerAccessToken}`, "User-Agent": "authkit/1.0" },
        });
        const emails = (await emailRes.json()) as { email: string; primary: boolean; verified: boolean }[];
        email = emails.find((e) => e.primary && e.verified)?.email ?? null;
      }
    }
  } catch {
    res.status(500).send("<p>Failed to fetch user info from provider</p>");
    return;
  }

  // Find or create AppUser via OAuthAccount
  let appUserId: string;
  let isNew = false;

  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
  });

  if (existingAccount) {
    appUserId = existingAccount.appUserId;
    // Keep imageUrl fresh
    await prisma.appUser.update({ where: { id: appUserId }, data: { imageUrl } });
  } else {
    // Link to existing user by email if possible, otherwise create new
    let user = email
      ? await prisma.appUser.findFirst({ where: { applicationId: app.id, email } })
      : null;

    if (!user) {
      user = await prisma.appUser.create({
        data: {
          applicationId: app.id,
          email,
          firstName,
          lastName,
          imageUrl,
          emailVerified: true, // email is verified by the OAuth provider
        },
      });
      isNew = true;
    }

    await prisma.oAuthAccount.create({
      data: { appUserId: user.id, provider, providerId, email },
    });
    appUserId = user.id;
  }

  const user = await prisma.appUser.findUniqueOrThrow({ where: { id: appUserId } });

  if (user.banned) {
    res.status(403).send("<p>This account has been banned.</p>");
    return;
  }

  // Create app session
  const payload = {
    sub: user.id,
    azp: app.id,
    email: user.email ?? undefined,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
  };
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

  await prisma.appUser.update({ where: { id: user.id }, data: { lastSignInAt: new Date() } });

  // Fire webhooks
  if (app.webhookUrl && app.webhookSecret) {
    fireWebhook(
      app.webhookUrl,
      app.webhookSecret,
      isNew ? "user.created" : "user.signed_in",
      { id: user.id, email: user.email, provider }
    );
  }

  // Redirect back to the developer's app with tokens in query params
  const redirect = new URL(statePayload.redirectUrl);
  redirect.searchParams.set("accessToken", accessToken);
  redirect.searchParams.set("refreshToken", refreshToken);
  res.redirect(redirect.toString());
}
