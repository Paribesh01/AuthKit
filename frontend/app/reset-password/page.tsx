"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2000);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Reset failed. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <CardContent className="pt-6 text-center space-y-4">
        <p className="text-sm text-destructive">Invalid reset link.</p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">Request a new one</Button>
        </Link>
      </CardContent>
    );
  }

  if (done) {
    return (
      <CardContent className="pt-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Password reset!</h2>
          <p className="text-sm text-muted-foreground mt-1">Redirecting you to sign in...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" placeholder="Repeat new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="text-2xl font-bold tracking-tight">
            Auth<span className="text-violet-400">Kit</span>
          </span>
        </div>
        <Card>
          <Suspense fallback={<CardContent className="pt-6"><p className="text-sm text-muted-foreground">Loading...</p></CardContent>}>
            <ResetPasswordForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
