import React from "react";
import { useAuthContext } from "./context";

/** Renders children only when the user is signed in (and auth has loaded). */
export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthContext();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

/** Renders children only when the user is signed out (and auth has loaded). */
export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthContext();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

/** Shows a fallback while auth state is loading, then renders children. */
export function AuthLoaded({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isLoaded } = useAuthContext();
  return <>{isLoaded ? children : fallback}</>;
}
