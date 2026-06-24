import crypto from "crypto";
import { prisma } from "../db/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function sendEmailVerificationOtp(appUserId: string, email: string, appName: string): Promise<void> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Invalidate old OTPs for this user/purpose
  await prisma.appEmailOtp.updateMany({
    where: { appUserId, purpose: "email_verify", used: false },
    data: { used: true },
  });

  await prisma.appEmailOtp.create({
    data: { appUserId, code: hashOtp(code), purpose: "email_verify", expiresAt },
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@authkit.dev",
    to: email,
    subject: `Your ${appName} verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="color:#666;margin:0 0 24px">Enter this code to verify your email address for <strong>${appName}</strong>:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;padding:24px;background:#f5f5f5;border-radius:8px">${code}</div>
        <p style="color:#999;font-size:13px;margin:16px 0 0;text-align:center">Expires in 10 minutes. Don't share this code.</p>
      </div>`,
  });
}

export async function verifyEmailOtp(
  appUserId: string,
  code: string,
  purpose: "email_verify" | "signin"
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.appEmailOtp.findFirst({
    where: { appUserId, purpose, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { valid: false, error: "No OTP found" };
  if (otp.expiresAt < new Date()) return { valid: false, error: "OTP expired" };
  if (!crypto.timingSafeEqual(Buffer.from(otp.code), Buffer.from(hashOtp(code)))) {
    return { valid: false, error: "Invalid code" };
  }

  await prisma.appEmailOtp.update({ where: { id: otp.id }, data: { used: true } });
  return { valid: true };
}
