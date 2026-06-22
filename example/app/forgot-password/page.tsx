"use client";

import { ForgotPassword } from "@paribeshn/authkit/react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <ForgotPassword
        redirectUrl={`${process.env.NEXT_PUBLIC_API_URL}/reset-password`}
        afterSubmit={() => {}}
      />
    </div>
  );
}
