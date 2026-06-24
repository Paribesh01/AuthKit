import { timingSafeEqual, createHmac } from "crypto";

// Timing-safe string comparison — prevents timing oracle attacks on tokens
export function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare anyway (prevents length-based timing leak)
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Generate a cryptographically random token
export function generateToken(bytes = 32): string {
  return require("crypto").randomBytes(bytes).toString("hex");
}

// HMAC-SHA256 for webhook signatures
export function hmacSign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
