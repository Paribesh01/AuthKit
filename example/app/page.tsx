"use client";

import { useAuth } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? "/dashboard" : "/sign-in");
  }, [isLoaded, isSignedIn, router]);

  return null;
}
