import crypto from "crypto";

// pk_live_<32 random hex bytes>
export function generatePublishableKey(): string {
  return `pk_live_${crypto.randomBytes(32).toString("hex")}`;
}

// sk_live_<32 random hex bytes>
export function generateSecretKey(): string {
  return `sk_live_${crypto.randomBytes(32).toString("hex")}`;
}

export function isPublishableKey(key: string): boolean {
  return /^pk_live_[a-f0-9]{64}$/.test(key);
}

export function isSecretKey(key: string): boolean {
  return /^sk_live_[a-f0-9]{64}$/.test(key);
}
