"use client";

import { ResetPassword } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <ResetPassword afterReset={() => router.push("/sign-in")} />
    </div>
  );
}
