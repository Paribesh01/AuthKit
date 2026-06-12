import { useAuthContext, type AuthContextValue } from "./context";
import type { AuthUser } from "../types";

/** Access auth state and actions from anywhere inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/** Lightweight hook when you only need the current user. */
export function useUser(): { user: AuthUser | null; isLoaded: boolean } {
  const { user, isLoaded } = useAuthContext();
  return { user, isLoaded };
}
