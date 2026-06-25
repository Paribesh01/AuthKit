import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthClient } from "../client";
import type {
  AuthConfig,
  AuthUser,
  MfaSetupResult,
  MfaVerifySetupResult,
  Session,
  SignInParams,
  SignUpParams,
} from "../types";

export interface AuthContextValue {
  client: AuthClient;
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  accessToken: string | null;

  // Auth
  signIn: (params: SignInParams) => Promise<AuthUser>;
  signUp: (params: SignUpParams) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string, redirectUrl?: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;

  // OAuth
  signInWithOAuth: (provider: "google" | "github", options: { redirectUrl: string }) => void;
  handleOAuthCallback: () => Promise<AuthUser | null>;

  // Sessions
  listSessions: () => Promise<Session[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;

  // Metadata
  updateMetadata: (publicMetadata: Record<string, unknown>) => Promise<AuthUser>;

  // MFA
  getMfaStatus: () => Promise<{ enabled: boolean }>;
  setupMfa: () => Promise<MfaSetupResult>;
  verifyMfaSetup: (code: string) => Promise<MfaVerifySetupResult>;
  disableMfa: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  publishableKey,
  baseUrl,
  persistSession,
}: AuthConfig & { children: React.ReactNode }) {
  const clientRef = useRef<AuthClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new AuthClient({ publishableKey, baseUrl, persistSession });
  }
  const client = clientRef.current;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    client.getUser().then((u) => {
      setUser(u);
      setAccessToken(client.getAccessToken());
      setIsLoaded(true);
    });
  }, [client]);

  const signIn = useCallback(
    async (params: SignInParams): Promise<AuthUser> => {
      const u = await client.signIn(params);
      setUser(u);
      setAccessToken(client.getAccessToken());
      return u;
    },
    [client]
  );

  const signUp = useCallback(
    async (params: SignUpParams): Promise<AuthUser> => {
      const u = await client.signUp(params);
      setUser(u);
      setAccessToken(client.getAccessToken());
      return u;
    },
    [client]
  );

  const signOut = useCallback(async (): Promise<void> => {
    await client.signOut();
    setUser(null);
    setAccessToken(null);
  }, [client]);

  const forgotPassword = useCallback(
    (email: string, redirectUrl?: string) => client.forgotPassword(email, redirectUrl),
    [client]
  );

  const resetPassword = useCallback(
    (token: string, password: string) => client.resetPassword(token, password),
    [client]
  );

  const signInWithOAuth = useCallback(
    (provider: "google" | "github", options: { redirectUrl: string }) =>
      client.signInWithOAuth(provider, options),
    [client]
  );

  const handleOAuthCallback = useCallback(async (): Promise<AuthUser | null> => {
    const u = await client.handleOAuthCallback();
    if (u) { setUser(u); setAccessToken(client.getAccessToken()); }
    return u;
  }, [client]);

  const listSessions = useCallback(() => client.getSessions(), [client]);
  const revokeSession = useCallback((id: string) => client.revokeSession(id), [client]);
  const revokeAllSessions = useCallback(async () => {
    await client.revokeAllSessions();
    setUser(null);
    setAccessToken(null);
  }, [client]);

  const updateMetadata = useCallback(
    async (publicMetadata: Record<string, unknown>): Promise<AuthUser> => {
      const u = await client.updateMetadata(publicMetadata);
      setUser(u);
      return u;
    },
    [client]
  );

  const getMfaStatus = useCallback(() => client.getMfaStatus(), [client]);
  const setupMfa = useCallback(() => client.setupMfa(), [client]);
  const verifyMfaSetup = useCallback((code: string) => client.verifyMfaSetup(code), [client]);
  const disableMfa = useCallback((code: string) => client.disableMfa(code), [client]);

  return (
    <AuthContext.Provider
      value={{
        client,
        user,
        isLoaded,
        isSignedIn: !!user,
        accessToken,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
        signInWithOAuth,
        handleOAuthCallback,
        listSessions,
        revokeSession,
        revokeAllSessions,
        updateMetadata,
        getMfaStatus,
        setupMfa,
        verifyMfaSetup,
        disableMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
