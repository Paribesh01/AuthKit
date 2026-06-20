export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  imageUrl?: string | null;
  banned?: boolean;
  publicMetadata?: Record<string, unknown> | null;
  lastSignInAt?: string | null;
  createdAt?: string;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthConfig {
  /** Your app's publishable key — safe to expose in frontend code */
  publishableKey: string;
  /** Base URL of your auth service, e.g. "https://auth.myapp.com" */
  baseUrl: string;
  /**
   * Persist session across browser restarts using localStorage.
   * Defaults to true. Set to false to use sessionStorage (clears on tab close).
   */
  persistSession?: boolean;
}

export interface SignUpParams {
  email?: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInParams {
  email?: string;
  username?: string;
  password: string;
}
