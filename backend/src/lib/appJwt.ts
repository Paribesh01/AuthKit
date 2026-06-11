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
