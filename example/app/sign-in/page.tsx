"use client";

import { SignIn } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)",
        padding: "1.5rem",
      }}
    >
      <SignIn
        afterSignIn={() => router.push("/dashboard")}
        signUpUrl="/sign-up"
        forgotPasswordUrl="/forgot-password"
        oauthCallbackUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
      />
    </div>
  );
}
