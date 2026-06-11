"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { refreshToken } from "../../../../../lib/auth";
import {
  listUsers,
  banUser,
  unbanUser,
  deleteUser,
  AppUser,
} from "../../../../../lib/dashboard";

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await refreshToken();
        const data = await listUsers(appId, page);
        setUsers(data.users);
        setTotal(data.total);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId, page, router]);

  async function handleBan(user: AppUser) {
    if (!confirm(`Ban ${user.email ?? user.username}?`)) return;
    setActionUserId(user.id);
    try {
      await banUser(appId, user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: true } : u)));
    } finally {
      setActionUserId(null);
    }
  }

  async function handleUnban(user: AppUser) {
    setActionUserId(user.id);
    try {
      await unbanUser(appId, user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: false } : u)));
    } finally {
      setActionUserId(null);
    }
  }

  async function handleDelete(user: AppUser) {
    if (!confirm(`Permanently delete ${user.email ?? user.username}?`)) return;
    setActionUserId(user.id);
    try {
      await deleteUser(appId, user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((t) => t - 1);
    } finally {
      setActionUserId(null);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/dashboard/apps/${appId}`}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← App settings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Users</span>
        <span className="ml-auto text-sm text-gray-400">{total} total</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-20">Loading users...</p>
        ) : users.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No users yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Last sign in</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-xs shrink-0">
                            {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email ?? user.username ?? "—"}
                            </p>
                            <p className="text-xs text-gray-400">{user.email ?? user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            Banned
                          </span>
                        ) : user.emailVerified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(user.lastSignInAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {user.banned ? (
                            <button
                              onClick={() => handleUnban(user)}
                              disabled={actionUserId === user.id}
                              className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user)}
                              disabled={actionUserId === user.id}
                              className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={actionUserId === user.id}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
