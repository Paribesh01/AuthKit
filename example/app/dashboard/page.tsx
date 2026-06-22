"use client";

import { useAuth, SignedIn } from "@paribeshn/authkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn, signOut, client } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const s = await client.getSessions();
      setSessions(s as Session[]);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleRevoke(id: string) {
    await client.revokeSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in");
  }

  if (!isLoaded || !isSignedIn) return null;

  return (
    <SignedIn>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">
              <span className="text-gray-900">Auth</span>
              <span className="text-indigo-600">Kit</span>
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Dashboard</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {/* User card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
              Signed in as
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username ?? "—"}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <span
                className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
                  user?.emailVerified
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {user?.emailVerified ? "Verified" : "Unverified"}
              </span>
            </div>

            {user?.publicMetadata && Object.keys(user.publicMetadata).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Public metadata
                </p>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(user.publicMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* OAuth */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
              Sign in with
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  client.signInWithOAuth("google", {
                    redirectUrl: `${window.location.origin}/auth/callback`,
                  })
                }
                className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                onClick={() =>
                  client.signInWithOAuth("github", {
                    redirectUrl: `${window.location.origin}/auth/callback`,
                  })
                }
                className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Active sessions
              </h2>
              <button
                onClick={loadSessions}
                disabled={loadingSessions}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {loadingSessions ? "Loading..." : "Load sessions"}
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400">Click &quot;Load sessions&quot; to view active sessions.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">
                          {s.userAgent?.split(" ")[0] ?? "Unknown device"}
                        </p>
                        {s.isCurrent && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{s.ipAddress ?? "Unknown IP"}</p>
                    </div>
                    {!s.isCurrent && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SignedIn>
  );
}
