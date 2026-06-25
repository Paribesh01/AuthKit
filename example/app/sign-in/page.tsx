"use client";

import { SignIn } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn
        afterSignIn={() => router.push("/dashboard")}
        signUpUrl="/sign-up"
        forgotPasswordUrl="/forgot-password"
        oauthProviders={["google", "github"]}
        oauthCallbackUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
      />
    </div>
  );
}
