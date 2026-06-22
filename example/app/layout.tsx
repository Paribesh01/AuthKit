"use client";

import { Geist } from "next/font/google";
import { AuthProvider } from "@paribeshn/authkit/react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <AuthProvider
          publishableKey={process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!}
          baseUrl={process.env.NEXT_PUBLIC_API_URL!}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
