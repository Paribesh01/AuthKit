"use client";

import { SignUp } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp
        afterSignUp={() => router.push("/dashboard")}
        signInUrl="/sign-in"
        showName
        oauthProviders={["google", "github"]}
        oauthCallbackUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
      />
    </div>
  );
}
