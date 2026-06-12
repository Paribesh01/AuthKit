import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthClient } from "../client";
import type { AuthConfig, AuthUser, SignInParams, SignUpParams } from "../types";

export interface AuthContextValue {
  client: AuthClient;
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (params: SignInParams) => Promise<AuthUser>;
  signUp: (params: SignUpParams) => Promise<AuthUser>;
  signOut: () => Promise<void>;
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
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    client.getUser().then((u) => {
      setUser(u);
      setIsLoaded(true);
    });
  }, [client]);

  const signIn = useCallback(
    async (params: SignInParams): Promise<AuthUser> => {
      const u = await client.signIn(params);
      setUser(u);
      return u;
    },
    [client]
  );

  const signUp = useCallback(
    async (params: SignUpParams): Promise<AuthUser> => {
      const u = await client.signUp(params);
      setUser(u);
      return u;
    },
    [client]
  );

  const signOut = useCallback(async (): Promise<void> => {
    await client.signOut();
    setUser(null);
  }, [client]);

  return (
    <AuthContext.Provider
      value={{
        client,
        user,
        isLoaded,
        isSignedIn: !!user,
        signIn,
        signUp,
        signOut,
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
