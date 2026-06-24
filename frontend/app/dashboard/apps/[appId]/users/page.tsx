"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { listUsers, banUser, unbanUser, deleteUser, AppUser } from "../../../../../lib/dashboard";

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function load() {
      try {
        const data = await listUsers(appId, page);
        setUsers(data.users);
        setTotal(data.total);
      } catch { router.replace("/dashboard"); }
      finally { setLoading(false); }
    }
    load();
  }, [appId, page, router]);

  async function handleBan(user: AppUser) {
    if (!confirm(`Ban ${user.email ?? user.username}?`)) return;
    setActionUserId(user.id);
    try { await banUser(appId, user.id); setUsers(p => p.map(u => u.id === user.id ? { ...u, banned: true } : u)); }
    finally { setActionUserId(null); }
  }
  async function handleUnban(user: AppUser) {
    setActionUserId(user.id);
    try { await unbanUser(appId, user.id); setUsers(p => p.map(u => u.id === user.id ? { ...u, banned: false } : u)); }
    finally { setActionUserId(null); }
  }
  async function handleDelete(user: AppUser) {
    if (!confirm(`Permanently delete ${user.email ?? user.username}?`)) return;
    setActionUserId(user.id);
    try { await deleteUser(appId, user.id); setUsers(p => p.filter(u => u.id !== user.id)); setTotal(t => t - 1); }
    finally { setActionUserId(null); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3 sticky top-0 z-10 bg-[#080808]/90 backdrop-blur-sm">
        <Link href={`/dashboard/apps/${appId}`} className="text-sm text-white/40 hover:text-white transition-colors">
          ← App settings
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium">Users</span>
        <span className="ml-auto text-xs text-white/30">{total} total</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-white/30 text-sm">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No users yet</p>
            <p className="text-sm text-white/40">Users will appear here once they sign up through your app.</p>
          </div>
        ) : (
          <>
            <div className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Last sign in</th>
                    <th className="px-4 py-3 text-right text-[10px] font-medium text-white/30 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-medium text-xs shrink-0">
                            {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white/80">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email ?? user.username ?? "—"}
                            </p>
                            <p className="text-xs text-white/30">{user.email ?? user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Banned</span>
                        ) : user.emailVerified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Unverified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(user.lastSignInAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {user.banned ? (
                            <button onClick={() => handleUnban(user)} disabled={actionUserId === user.id} className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40">Unban</button>
                          ) : (
                            <button onClick={() => handleBan(user)} disabled={actionUserId === user.id} className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40">Ban</button>
                          )}
                          <button onClick={() => handleDelete(user)} disabled={actionUserId === user.id} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                >
                  Previous
                </button>
                <span className="text-xs text-white/30">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
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
