import crypto from "crypto";

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function tokenExpiresAt(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
