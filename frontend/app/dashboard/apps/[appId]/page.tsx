"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getApplication, updateApplication, rotateSecretKey, rotateWebhookSecret,
  deleteApplication, listOAuthProviders, upsertOAuthProvider,
  listUsers, banUser, unbanUser, deleteUser, createUser,
  listEvents, getAppStats, getActivityChart, getAppSettingsData, updateAppSettings,
  listUserSessions, revokeOneSession,
  Application, OAuthProvider, AppUser, AppEvent, AppStats,
  AppSession, AppSettings, ChartPoint,
} from "../../../../lib/dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => onChange(!on)} disabled={disabled}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-violet-600" : "bg-white/10"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function KeyField({ label, value, secret, masked }: { label: string; value: string; secret?: boolean; masked?: string }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-[10px] text-white/30 mb-2 font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-white/70 truncate">{revealed ? value : (masked ?? "•".repeat(32))}</code>
        {secret && <button onClick={() => setRevealed(r => !r)} className="text-xs text-white/30 hover:text-white/70 transition-colors shrink-0">{revealed ? "Hide" : "Reveal"}</button>}
        <button onClick={copy} className="text-xs text-white/30 hover:text-white/70 transition-colors shrink-0">{copied ? "Copied!" : "Copy"}</button>
      </div>
    </div>
  );
}

const EVENT_COLORS: Record<string, string> = {
  "user.created":  "bg-green-500/10 text-green-400 border-green-500/20",
  "user.signed_in":"bg-blue-500/10 text-blue-400 border-blue-500/20",
  "user.banned":   "bg-red-500/10 text-red-400 border-red-500/20",
  "user.unbanned": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "user.deleted":  "bg-red-500/10 text-red-400 border-red-500/20",
};

function EventBadge({ type }: { type: string }) {
  const cls = EVENT_COLORS[type] ?? "bg-white/5 text-white/40 border-white/10";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{type}</span>;
}

// ── Tab types ─────────────────────────────────────────────────────────────────
type Tab = "overview" | "users" | "logs" | "settings" | "configure";

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {d.count} sign-in{d.count !== 1 ? "s" : ""}<br/><span className="text-white/40">{d.date.slice(5)}</span>
            </div>
            <div style={{ height: `${Math.max(pct, 4)}%` }}
              className={`w-full rounded-sm transition-all ${isToday ? "bg-violet-500" : "bg-violet-500/30 group-hover:bg-violet-500/50"}`} />
            <span className="text-[9px] text-white/20">{d.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

function OverviewTab({ app, stats, recentEvents, chart, onTabChange }: {
  app: Application; stats: AppStats | null; recentEvents: AppEvent[];
  chart: ChartPoint[]; onTabChange: (t: Tab) => void;
}) {
  const statCards = [
    { label: "Total users", value: stats?.totalUsers ?? "—", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { label: "Active sessions", value: stats?.activeSessions ?? "—", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    )},
    { label: "New users (30d)", value: stats?.newUsersLast30Days ?? "—", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
    )},
    { label: "Events today", value: stats?.eventsToday ?? "—", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">{s.icon}</div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 7-day activity chart */}
      {chart.length > 0 && (
        <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Sign-ins — last 7 days</h3>
            <p className="text-xs text-white/30">{chart.reduce((s, d) => s + d.count, 0)} total</p>
          </div>
          <MiniBarChart data={chart} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Quick keys */}
        <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">API Keys</h3>
            <button onClick={() => onTabChange("configure")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Manage →</button>
          </div>
          <div className="space-y-2">
            <KeyField label="Publishable key" value={app.publishableKey} />
            {app.secretKey && <KeyField label="Secret key" value={app.secretKey} secret masked={"sk_live_" + "•".repeat(24)} />}
          </div>
        </div>

        {/* Recent activity */}
        <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <button onClick={() => onTabChange("logs")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</button>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-6">No events yet. Events appear here after users sign in.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center gap-3 py-1.5">
                  <EventBadge type={e.eventType} />
                  <span className="text-xs text-white/40 truncate flex-1">{e.actorEmail ?? e.actorId ?? "—"}</span>
                  <span className="text-[11px] text-white/25 shrink-0">{fmtTime(e.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
        <h3 className="text-sm font-semibold mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Manage users", tab: "users" as Tab, icon: "👥" },
            { label: "View logs", tab: "logs" as Tab, icon: "📋" },
            { label: "Configure app", tab: "configure" as Tab, icon: "⚙️" },
          ].map(a => (
            <button key={a.tab} onClick={() => onTabChange(a.tab)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/30 transition-all text-sm text-white/60 hover:text-white">
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────────────────────────────────────

function SessionDrawer({ appId, user, onClose }: { appId: string; user: AppUser; onClose: () => void }) {
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    listUserSessions(appId, user.id).then(s => { setSessions(s); setLoading(false); });
  }, [appId, user.id]);

  async function revoke(id: string) {
    setRevoking(id);
    try { await revokeOneSession(appId, id); setSessions(s => s.filter(x => x.id !== id)); }
    finally { setRevoking(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h2 className="text-sm font-semibold">Sessions</h2>
            <p className="text-xs text-white/40 mt-0.5">{user.email ?? user.username}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">✕</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-white/30 text-sm">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">No active sessions</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {sessions.map(s => {
              const expired = new Date(s.expiresAt) < new Date();
              return (
                <div key={s.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${expired ? "bg-white/20" : "bg-green-400"}`} />
                      <p className="text-xs text-white/60 truncate">{s.userAgent ?? "Unknown browser"}</p>
                    </div>
                    <p className="text-[10px] text-white/25">{s.ipAddress ?? "Unknown IP"} · Started {fmtTime(s.createdAt)}</p>
                    <p className="text-[10px] text-white/20">{expired ? "Expired" : `Expires ${fmtTime(s.expiresAt)}`}</p>
                  </div>
                  <button onClick={() => revoke(s.id)} disabled={revoking === s.id} className="shrink-0 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                    {revoking === s.id ? "..." : "Revoke"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ appId }: { appId: string }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await listUsers(appId, page, 20, search || undefined); setUsers(d.users); setTotal(d.total); }
    finally { setLoading(false); }
  }, [appId, page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleBan(u: AppUser) {
    if (!confirm(`Ban ${u.email}?`)) return;
    setActionId(u.id);
    try { await banUser(appId, u.id); setUsers(p => p.map(x => x.id === u.id ? { ...x, banned: true } : x)); }
    finally { setActionId(null); }
  }
  async function handleUnban(u: AppUser) {
    setActionId(u.id);
    try { await unbanUser(appId, u.id); setUsers(p => p.map(x => x.id === u.id ? { ...x, banned: false } : x)); }
    finally { setActionId(null); }
  }
  async function handleDelete(u: AppUser) {
    if (!confirm(`Permanently delete ${u.email}?`)) return;
    setActionId(u.id);
    try { await deleteUser(appId, u.id); setUsers(p => p.filter(x => x.id !== u.id)); setTotal(t => t - 1); }
    finally { setActionId(null); }
  }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(""); setAdding(true);
    try {
      const user = await createUser(appId, addForm);
      setUsers(p => [user, ...p]); setTotal(t => t + 1);
      setShowAdd(false); setAddForm({ email: "", password: "", firstName: "", lastName: "" });
    } catch (err: unknown) {
      setAddError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create user");
    } finally { setAdding(false); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {sessionUser && <SessionDrawer appId={appId} user={sessionUser} onClose={() => setSessionUser(null)} />}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/></svg>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by name, email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40" />
        </div>
        {search && <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className="text-xs text-white/30 hover:text-white transition-colors">Clear</button>}
        <p className="text-sm text-white/40 ml-auto">{total} users</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add user
        </button>
      </div>

      {/* Add user dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-semibold mb-4">Add user</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-white/50 mb-1">First name</label>
                  <input value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Last name</label>
                  <input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Email <span className="text-red-400">*</span></label>
                <input required type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Password <span className="text-white/25">(min 8 chars)</span></label>
                <input type="password" minLength={8} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for passwordless" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50" />
              </div>
              {addError && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{addError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={adding} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
                  {adding ? "Creating..." : "Create user"}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-white/30 text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Loading...
        </div>
      ) : users.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <p className="font-medium mb-1">No users yet</p>
          <p className="text-sm text-white/40 mb-4">Users appear here when they sign up through your app.</p>
          <button onClick={() => setShowAdd(true)} className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-xl transition-colors">Add first user</button>
        </div>
      ) : (
        <>
          <div className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">Last sign in</th>
                  <th className="px-4 py-3 text-right text-[10px] text-white/30 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-medium text-xs shrink-0">
                          {(u.firstName?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white/80">{u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? u.username ?? "—"}</p>
                          <p className="text-xs text-white/30">{u.email ?? u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Banned</span>
                      ) : u.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{fmt(u.lastSignInAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setSessionUser(u)} className="text-xs text-white/30 hover:text-white/70 transition-colors">Sessions</button>
                        {u.banned
                          ? <button onClick={() => handleUnban(u)} disabled={actionId === u.id} className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40">Unban</button>
                          : <button onClick={() => handleBan(u)} disabled={actionId === u.id} className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40">Ban</button>
                        }
                        <button onClick={() => handleDelete(u)} disabled={actionId === u.id} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">Previous</button>
              <span className="text-xs text-white/30">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs Tab
// ─────────────────────────────────────────────────────────────────────────────

const ALL_EVENT_TYPES = ["user.created", "user.signed_in", "user.banned", "user.unbanned", "user.deleted"];

function LogsTab({ appId }: { appId: string }) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await listEvents(appId, page, filter || undefined); setEvents(d.events); setTotal(d.total); }
    finally { setLoading(false); }
  }, [appId, page, filter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => { setFilter(""); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filter ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white border border-white/[0.07]"}`}>
            All
          </button>
          {ALL_EVENT_TYPES.map(t => (
            <button key={t} onClick={() => { setFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === t ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white border border-white/[0.07]"}`}>
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/25 ml-auto">{total} events</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-white/30 text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Loading...
        </div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-white/40 text-sm">No events found</p>
          {filter && <button onClick={() => setFilter("")} className="mt-2 text-xs text-violet-400 hover:text-violet-300">Clear filter</button>}
        </div>
      ) : (
        <>
          <div className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">Event type</th>
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-wider hidden md:table-cell">IP</th>
                  <th className="px-4 py-3 text-right text-[10px] text-white/30 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3"><EventBadge type={e.eventType} /></td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white/70">{e.actorEmail ?? "—"}</p>
                      {e.actorId && <p className="text-[10px] text-white/25 font-mono">{e.actorId.slice(0, 12)}…</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 hidden md:table-cell">{e.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/40 text-right whitespace-nowrap">{fmtTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">Previous</button>
              <span className="text-xs text-white/30">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Configure Tab
// ─────────────────────────────────────────────────────────────────────────────

function ConfigureTab({ app, setApp, oauthProviders, setOauthProviders, appId }: {
  app: Application; setApp: (a: Application) => void;
  oauthProviders: OAuthProvider[]; setOauthProviders: (p: OAuthProvider[]) => void;
  appId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(app.name);
  const [saving, setSaving] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(app.webhookUrl ?? "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [rotatingWebhook, setRotatingWebhook] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingOAuth, setTogglingOAuth] = useState<string | null>(null);

  const inputCls = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30";
  const btnPrimary = "bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40";
  const btnGhost = "px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all";

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { const u = await updateApplication(appId, { name }); setApp({ ...app, ...u }); setEditing(false); }
    finally { setSaving(false); }
  }
  async function handleRotate() {
    if (!confirm("Rotate secret key? Existing integrations will break until updated.")) return;
    setRotating(true);
    try { const k = await rotateSecretKey(appId); setApp({ ...app, secretKey: k }); }
    finally { setRotating(false); }
  }
  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault(); setSavingWebhook(true);
    try { await updateApplication(appId, { webhookUrl: webhookUrl || null }); setApp({ ...app, webhookUrl }); setEditingWebhook(false); }
    finally { setSavingWebhook(false); }
  }
  async function handleRotateWebhookSecret() {
    if (!confirm("Rotate webhook secret? Update your webhook handler.")) return;
    setRotatingWebhook(true);
    try { const s = await rotateWebhookSecret(appId); setApp({ ...app, webhookSecret: s }); }
    finally { setRotatingWebhook(false); }
  }
  async function handleToggleOAuth(provider: string, enabled: boolean) {
    setTogglingOAuth(provider);
    try {
      const saved = await upsertOAuthProvider(appId, { provider, enabled });
      setOauthProviders(oauthProviders.map(p => p.provider === saved.provider ? { ...p, enabled: saved.enabled } : p));
    } finally { setTogglingOAuth(null); }
  }
  async function handleDelete() {
    if (!confirm(`Delete "${app.name}"? This permanently deletes all users and sessions.`)) return;
    setDeleting(true);
    try { await deleteApplication(appId); router.replace("/dashboard"); }
    finally { setDeleting(false); }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Name */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <h2 className="text-sm font-semibold mb-4">Application name</h2>
        {editing ? (
          <form onSubmit={handleSaveName} className="flex gap-2">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className={`flex-1 ${inputCls}`} />
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save"}</button>
            <button type="button" onClick={() => { setEditing(false); setName(app.name); }} className={btnGhost}>Cancel</button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/70">{app.name}</p>
            <button onClick={() => setEditing(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
          </div>
        )}
      </section>

      {/* API Keys */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">API Keys</h2>
          <p className="text-xs text-white/40 mt-0.5">Publishable key in frontend, secret key in backend only.</p>
        </div>
        <div className="space-y-3">
          <KeyField label="Publishable key" value={app.publishableKey} />
          {app.secretKey && <KeyField label="Secret key" value={app.secretKey} secret masked={"sk_live_" + "•".repeat(24)} />}
        </div>
        <button onClick={handleRotate} disabled={rotating} className="mt-4 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40">
          {rotating ? "Rotating..." : "Rotate secret key"}
        </button>
      </section>

      {/* Webhooks */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Webhooks</h2>
          <p className="text-xs text-white/40 mt-0.5">Signed HMAC-SHA256 events on every user lifecycle action.</p>
        </div>
        {editingWebhook ? (
          <form onSubmit={handleSaveWebhook} className="flex gap-2 mb-4">
            <input autoFocus type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://myapp.com/webhooks/auth" className={`flex-1 ${inputCls}`} />
            <button type="submit" disabled={savingWebhook} className={btnPrimary}>{savingWebhook ? "Saving..." : "Save"}</button>
            <button type="button" onClick={() => { setEditingWebhook(false); setWebhookUrl(app.webhookUrl ?? ""); }} className={btnGhost}>Cancel</button>
          </form>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-mono text-white/50">{app.webhookUrl || <span className="font-sans text-xs text-white/25">No webhook URL set</span>}</p>
            <button onClick={() => setEditingWebhook(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0 ml-4">{app.webhookUrl ? "Edit" : "Add URL"}</button>
          </div>
        )}
        {app.webhookSecret && (
          <div className="space-y-3">
            <KeyField label="Webhook signing secret" value={app.webhookSecret} secret masked={"whsec_" + "•".repeat(24)} />
            <button onClick={handleRotateWebhookSecret} disabled={rotatingWebhook} className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40">
              {rotatingWebhook ? "Rotating..." : "Rotate webhook secret"}
            </button>
          </div>
        )}
        <div className="mt-4 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-2">Events</p>
          <div className="flex flex-wrap gap-1.5">
            {["user.created", "user.signed_in", "user.banned", "user.unbanned", "user.deleted"].map(e => (
              <span key={e} className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.07] rounded text-[11px] font-mono text-white/40">{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Social Login */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Social Login</h2>
          <p className="text-xs text-white/40 mt-0.5">Powered by AuthKit's own OAuth apps — no setup needed.</p>
        </div>
        <div className="space-y-2">
          {oauthProviders.map(p => (
            <div key={p.provider} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  {p.provider === "google" ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{p.provider}</p>
                  <p className="text-[11px] text-white/30">Managed by AuthKit</p>
                </div>
              </div>
              <Toggle on={p.enabled} onChange={v => handleToggleOAuth(p.provider, v)} disabled={togglingOAuth === p.provider} />
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="border border-red-500/20 rounded-2xl p-6 bg-red-500/[0.03]">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Danger zone</h2>
        <p className="text-xs text-white/40 mb-4">Permanently delete this application and all its users.</p>
        <button onClick={handleDelete} disabled={deleting} className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
          {deleting ? "Deleting..." : "Delete application"}
        </button>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ appId }: { appId: string }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettingsData(appId).then(setSettings);
  }, [appId]);

  async function save(patch: Partial<AppSettings>) {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateAppSettings(appId, patch);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  if (!settings) return (
    <div className="flex items-center justify-center py-16 text-white/30 text-sm">Loading settings...</div>
  );

  const inputCls = "w-20 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-violet-500/50 text-center";
  const rowCls = "flex items-center justify-between py-4 border-b border-white/[0.05] last:border-0";

  return (
    <div className="max-w-2xl space-y-4">
      {saved && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-2.5 rounded-xl">
          Settings saved
        </div>
      )}

      {/* Password policy */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <h2 className="text-sm font-semibold mb-1">Password policy</h2>
        <p className="text-xs text-white/40 mb-4">Applied to all sign-up and password reset flows.</p>
        <div className={rowCls}>
          <div>
            <p className="text-sm text-white/80">Minimum length</p>
            <p className="text-xs text-white/30 mt-0.5">Min 6, max 72</p>
          </div>
          <input type="number" min={6} max={72} value={settings.passwordMinLength}
            onChange={e => save({ passwordMinLength: parseInt(e.target.value) })}
            className={inputCls} />
        </div>
        <div className={rowCls}>
          <div><p className="text-sm text-white/80">Require uppercase letter</p></div>
          <Toggle on={settings.requireUppercase} disabled={saving} onChange={v => save({ requireUppercase: v })} />
        </div>
        <div className={rowCls}>
          <div><p className="text-sm text-white/80">Require number</p></div>
          <Toggle on={settings.requireNumber} disabled={saving} onChange={v => save({ requireNumber: v })} />
        </div>
      </section>

      {/* Sign-up policy */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <h2 className="text-sm font-semibold mb-4">Sign-up policy</h2>
        <div className={rowCls}>
          <div>
            <p className="text-sm text-white/80">Allow new sign-ups</p>
            <p className="text-xs text-white/30 mt-0.5">Disable to prevent new users from registering</p>
          </div>
          <Toggle on={settings.allowSignups} disabled={saving} onChange={v => save({ allowSignups: v })} />
        </div>
        <div className={rowCls}>
          <div>
            <p className="text-sm text-white/80">Require email verification</p>
            <p className="text-xs text-white/30 mt-0.5">Users must verify before accessing protected routes</p>
          </div>
          <Toggle on={settings.requireEmailVerification} disabled={saving} onChange={v => save({ requireEmailVerification: v })} />
        </div>
      </section>

      {/* Session policy */}
      <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
        <h2 className="text-sm font-semibold mb-4">Session policy</h2>
        <div className={rowCls}>
          <div>
            <p className="text-sm text-white/80">Session duration (hours)</p>
            <p className="text-xs text-white/30 mt-0.5">How long refresh tokens are valid (1–8760)</p>
          </div>
          <input type="number" min={1} max={8760} value={settings.sessionDurationHours}
            onChange={e => save({ sessionDurationHours: parseInt(e.target.value) })}
            className={inputCls} />
        </div>
        <div className={rowCls}>
          <div>
            <p className="text-sm text-white/80">Max sessions per user</p>
            <p className="text-xs text-white/30 mt-0.5">Oldest session removed when limit is exceeded</p>
          </div>
          <input type="number" min={1} max={100} value={settings.maxSessionsPerUser}
            onChange={e => save({ maxSessionsPerUser: parseInt(e.target.value) })}
            className={inputCls} />
        </div>
      </section>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "users",     label: "Users" },
  { id: "logs",      label: "Logs" },
  { id: "settings",  label: "Settings" },
  { id: "configure", label: "Configure" },
];

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AppEvent[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function load() {
      try {
        const [data, providers, statsData, eventsData, chartData] = await Promise.all([
          getApplication(appId),
          listOAuthProviders(appId),
          getAppStats(appId),
          listEvents(appId, 1),
          getActivityChart(appId),
        ]);
        setApp(data);
        setOauthProviders(providers);
        setStats(statsData);
        setRecentEvents(eventsData.events);
        setChart(chartData);
      } catch { router.replace("/dashboard"); }
      finally { setLoading(false); }
    }
    load();
  }, [appId, router]);

  if (loading || !app) return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="flex items-center gap-2 text-white/40 text-sm">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Loading...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080808]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 py-4">
            <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors">← Applications</Link>
            <span className="text-white/20">/</span>
            <span className="text-sm font-medium">{app.name}</span>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  tab === t.id
                    ? "border-violet-500 text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "overview" && (
          <OverviewTab app={app} stats={stats} recentEvents={recentEvents} chart={chart} onTabChange={setTab} />
        )}
        {tab === "users" && <UsersTab appId={appId} />}
        {tab === "logs" && <LogsTab appId={appId} />}
        {tab === "settings" && <SettingsTab appId={appId} />}
        {tab === "configure" && (
          <ConfigureTab
            app={app} setApp={setApp}
            oauthProviders={oauthProviders} setOauthProviders={setOauthProviders}
            appId={appId}
          />
        )}
      </main>
    </div>
  );
}
