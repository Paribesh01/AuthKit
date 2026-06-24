import { prisma } from "../db/prisma";

export function logEvent(data: {
  applicationId: string;
  eventType: string;
  actorId?: string;
  actorEmail?: string | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  // fire-and-forget — never block the request
  prisma.appEvent
    .create({
      data: {
        applicationId: data.applicationId,
        eventType: data.eventType,
        actorId: data.actorId,
        actorEmail: data.actorEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: (data.metadata ?? {}) as object,
      },
    })
    .catch(() => {/* swallow — logging must not break auth flows */});
}
