"use client";

import { useAuth } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OAuthCallbackPage() {
  const { client } = useAuth();
  const router = useRouter();

  useEffect(() => {
    client.handleOAuthCallback().then((user) => {
      if (user) router.replace("/dashboard");
      else router.replace("/sign-in");
    });
  }, [client, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Completing sign in...</p>
    </div>
  );
}
