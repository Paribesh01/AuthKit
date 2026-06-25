"use client";

import { SignUp } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
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
