"use client";

import { useAuth } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OAuthCallbackPage() {
  const { handleOAuthCallback } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    handleOAuthCallback()
      .then((user) => {
        if (user) router.replace("/dashboard");
        else router.replace("/sign-in");
      })
      .catch((err: unknown) => {
        const msg = (err as { message?: string }).message || "Sign-in failed";
        setError(msg);
        setTimeout(() => router.replace("/sign-in"), 2500);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        gap: "1rem",
      }}
    >
      {error ? (
        <p style={{ color: "#dc2626", fontSize: ".9375rem" }}>{error} — redirecting…</p>
      ) : (
        <>
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #e2e8f0",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#64748b", fontSize: ".9375rem" }}>Completing sign in…</p>
        </>
      )}
    </div>
  );
}
