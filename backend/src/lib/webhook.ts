import crypto from "crypto";

export type WebhookEventType =
  | "user.created"
  | "user.signed_in"
  | "user.signed_out"
  | "user.deleted"
  | "user.banned"
  | "user.unbanned"
  | "user.password_reset";

export interface WebhookPayload {
  type: WebhookEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export function signWebhook(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function fireWebhook(
  webhookUrl: string,
  webhookSecret: string,
  type: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = { type, timestamp: Date.now(), data };
  const body = JSON.stringify(payload);
  const signature = signWebhook(webhookSecret, body);

  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authkit-signature": signature,
      "x-authkit-event": type,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    // Fire-and-forget — webhook delivery failures don't affect the auth response
  });
}
