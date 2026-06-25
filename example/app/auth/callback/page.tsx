"use client";

import { useAuth } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OAuthCallbackPage() {
  const { handleOAuthCallback } = useAuth();
  const router = useRouter();

  useEffect(() => {
    handleOAuthCallback().then((user) => {
      if (user) router.replace("/dashboard");
      else router.replace("/sign-in");
    });
  }, [handleOAuthCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Completing sign in...</p>
    </div>
  );
}
