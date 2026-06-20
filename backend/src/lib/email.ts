import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_URL = process.env.CLIENT_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function sendDeveloperPasswordReset(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${url}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}

export async function sendDeveloperEmailVerification(email: string, token: string) {
  const url = `${API_URL}/api/auth/verify-email/${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email",
    html: `
      <p>Thanks for signing up! Verify your email to get started.</p>
      <p><a href="${url}">Verify email</a></p>
      <p>This link expires in 60 minutes.</p>
    `,
  });
}

export async function sendAppUserPasswordReset(
  email: string,
  token: string,
  appName: string,
  redirectUrl: string
) {
  const url = `${redirectUrl}?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Reset your ${appName} password`,
    html: `
      <p>You requested a password reset for <strong>${appName}</strong>.</p>
      <p><a href="${url}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}

export async function sendAppUserEmailVerification(
  email: string,
  token: string,
  appName: string
) {
  const url = `${API_URL}/v1/verify-email/${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Verify your ${appName} email`,
    html: `
      <p>Verify your email address for <strong>${appName}</strong>.</p>
      <p><a href="${url}">Verify email</a></p>
      <p>This link expires in 60 minutes.</p>
    `,
  });
}
