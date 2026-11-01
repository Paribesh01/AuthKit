import { vi } from "vitest";

// In-memory stand-in for the Prisma client. Each test configures only the calls it cares about.
export function createPrismaMock() {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    application: model(),
    appSettings: model(),
    appUser: model(),
    appUserMfa: model(),
    appSession: model(),
    appPasswordReset: model(),
    appEmailVerification: model(),
    appEvent: model(),
    oAuthProvider: model(),
    oAuthAccount: model(),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const PUBLISHABLE_KEY = "pk_live_" + "a".repeat(64);
export const SECRET_KEY = "sk_live_" + "b".repeat(64);

export function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    name: "Acme",
    developerId: "dev_1",
    publishableKey: PUBLISHABLE_KEY,
    secretKey: SECRET_KEY,
    allowedOrigins: ["https://acme.com"],
    webhookUrl: null,
    webhookSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Default no-op behaviour for writes the happy paths perform.
export function stubWrites(prisma: PrismaMock) {
  prisma.appSession.create.mockResolvedValue({});
  prisma.appSession.findMany.mockResolvedValue([]);
  prisma.appSession.deleteMany.mockResolvedValue({ count: 0 });
  prisma.appUser.update.mockResolvedValue({});
  prisma.appUserMfa.update.mockResolvedValue({});
  prisma.appSettings.findUnique.mockResolvedValue(null);
  prisma.appEvent.create.mockResolvedValue({});
  prisma.appPasswordReset.updateMany.mockResolvedValue({ count: 0 });
  prisma.appPasswordReset.create.mockResolvedValue({});
}
