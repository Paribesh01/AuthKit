import jwt from "jsonwebtoken";

// App-user JWTs are signed with the application's secret key,
// so developers can verify them independently without calling our API.

export interface AppJwtPayload {
  sub: string;       // appUser id
  azp: string;       // applicationId
  email?: string;
  emailVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

export function signAppAccessToken(
  payload: AppJwtPayload,
  secretKey: string
): string {
  return jwt.sign(payload, secretKey, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

export function signAppRefreshToken(
  appUserId: string,
  applicationId: string,
  secretKey: string
): string {
  return jwt.sign({ sub: appUserId, azp: applicationId }, secretKey, {
    expiresIn: REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyAppToken(token: string, secretKey: string): AppJwtPayload {
  return jwt.verify(token, secretKey) as AppJwtPayload;
}

// MFA challenge tokens prove "password was correct" and nothing more.
// They're signed with a derived key so no access-token verifier (ours or the
// developer's, which uses the raw secret key) will ever accept one as a session.
const MFA_CHALLENGE_EXPIRY = "5m";
const MFA_CHALLENGE_TYP = "mfa_challenge";

function mfaChallengeKey(secretKey: string): string {
  return `${secretKey}:${MFA_CHALLENGE_TYP}`;
}

export function signMfaChallengeToken(
  appUserId: string,
  applicationId: string,
  secretKey: string
): string {
  return jwt.sign({ sub: appUserId, azp: applicationId, typ: MFA_CHALLENGE_TYP }, mfaChallengeKey(secretKey), {
    expiresIn: MFA_CHALLENGE_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyMfaChallengeToken(token: string, secretKey: string): { sub: string; azp: string } {
  const payload = jwt.verify(token, mfaChallengeKey(secretKey)) as { sub: string; azp: string; typ?: string };
  if (payload.typ !== MFA_CHALLENGE_TYP) throw new Error("Not an MFA challenge token");
  return payload;
}
