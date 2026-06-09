"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, User } from "../../lib/auth";
import { refreshToken } from "../../lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try to get a fresh access token on page load (uses httpOnly refresh cookie)
        await refreshToken();
        const me = await getMe();
        setUser(me);
      } catch {
        router.replace("/sign-in");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/sign-in");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xl">
              {user.firstName?.[0] ?? user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <dt className="text-xs text-gray-500 mb-1">User ID</dt>
              <dd className="text-sm font-mono text-gray-700 truncate">{user.id}</dd>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <dt className="text-xs text-gray-500 mb-1">Email status</dt>
              <dd className="text-sm">
                {user.emailVerified ? (
                  <span className="text-green-600 font-medium">Verified</span>
                ) : (
                  <span className="text-amber-600 font-medium">Unverified</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="text-center text-sm text-gray-400">
          More features coming soon — organizations, OAuth, MFA...
        </div>
      </main>
    </div>
  );
}
