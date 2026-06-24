"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getApplication, updateApplication, rotateSecretKey, rotateWebhookSecret,
  deleteApplication, listOAuthProviders, upsertOAuthProvider,
  Application, OAuthProvider,
} from "../../../../lib/dashboard";

function KeyField({ label, value, secret, masked }: { label: string; value: string; secret?: boolean; masked?: string }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-[11px] text-white/40 mb-2 font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-white/70 truncate">{revealed ? value : (masked ?? "•".repeat(32))}</code>
        {secret && (
          <button onClick={() => setRevealed(r => !r)} className="text-xs text-white/30 hover:text-white/70 shrink-0 transition-colors">
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        <button onClick={copy} className="text-xs text-white/30 hover:text-white/70 shrink-0 transition-colors">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [rotatingWebhook, setRotatingWebhook] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [togglingOAuth, setTogglingOAuth] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function load() {
      try {
        const [data, providers] = await Promise.all([getApplication(appId), listOAuthProviders(appId)]);
        setApp(data); setName(data.name); setWebhookUrl(data.webhookUrl ?? ""); setOauthProviders(providers);
      } catch { router.replace("/dashboard"); }
      finally { setLoading(false); }
    }
    load();
  }, [appId, router]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { const u = await updateApplication(appId, { name }); setApp(p => p ? { ...p, ...u } : p); setEditing(false); }
    finally { setSaving(false); }
  }
  async function handleRotate() {
    if (!confirm("Rotate secret key? Existing integrations will break until updated.")) return;
    setRotating(true);
    try { const k = await rotateSecretKey(appId); setApp(p => p ? { ...p, secretKey: k } : p); }
    finally { setRotating(false); }
  }
  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault(); setSavingWebhook(true);
    try { await updateApplication(appId, { webhookUrl: webhookUrl || null }); setApp(p => p ? { ...p, webhookUrl } : p); setEditingWebhook(false); }
    finally { setSavingWebhook(false); }
  }
  async function handleRotateWebhookSecret() {
    if (!confirm("Rotate webhook secret? Update your webhook handler to use the new secret.")) return;
    setRotatingWebhook(true);
    try { const s = await rotateWebhookSecret(appId); setApp(p => p ? { ...p, webhookSecret: s } : p); }
    finally { setRotatingWebhook(false); }
  }
  async function handleToggleOAuth(provider: string, enabled: boolean) {
    setTogglingOAuth(provider);
    try {
      const saved = await upsertOAuthProvider(appId, { provider, enabled });
      setOauthProviders(prev => prev.map(p => p.provider === saved.provider ? { ...p, enabled: saved.enabled } : p));
    } finally { setTogglingOAuth(null); }
  }
  async function handleDelete() {
    if (!confirm(`Delete "${app?.name}"? This permanently deletes all users and sessions.`)) return;
    setDeleting(true);
    try { await deleteApplication(appId); router.replace("/dashboard"); }
    finally { setDeleting(false); }
  }

  if (loading || !app) return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="flex items-center gap-2 text-white/40 text-sm">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Loading...
      </div>
    </div>
  );

  const inputCls = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30";
  const btnPrimary = "bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40";
  const btnGhost = "px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all";

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3 bg-[#080808] sticky top-0 z-10 backdrop-blur-sm">
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors">← Applications</Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium">{app.name}</span>
        <Link href={`/dashboard/apps/${appId}/users`} className="ml-auto text-sm text-violet-400 hover:text-violet-300 transition-colors">
          Manage users →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">

        {/* App name */}
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
              <p className="text-white/70 text-sm">{app.name}</p>
              <button onClick={() => setEditing(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
            </div>
          )}
        </section>

        {/* API Keys */}
        <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">API Keys</h2>
            <p className="text-xs text-white/40 mt-0.5">Use publishable key in frontend, secret key in backend only.</p>
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
            <p className="text-xs text-white/40 mt-0.5">Receive signed events on every user lifecycle action.</p>
          </div>
          {editingWebhook ? (
            <form onSubmit={handleSaveWebhook} className="flex gap-2 mb-4">
              <input autoFocus type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://myapp.com/webhooks/auth" className={`flex-1 ${inputCls}`} />
              <button type="submit" disabled={savingWebhook} className={btnPrimary}>{savingWebhook ? "Saving..." : "Save"}</button>
              <button type="button" onClick={() => { setEditingWebhook(false); setWebhookUrl(app.webhookUrl ?? ""); }} className={btnGhost}>Cancel</button>
            </form>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-mono text-white/50">{app.webhookUrl || <span className="text-white/25 not-italic font-sans text-xs">No webhook URL set</span>}</p>
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
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-2">Events fired</p>
            <div className="flex flex-wrap gap-1.5">
              {["user.created", "user.signed_in", "user.banned", "user.unbanned", "user.deleted"].map(e => (
                <span key={e} className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.07] rounded text-[11px] font-mono text-white/40">{e}</span>
              ))}
            </div>
          </div>
        </section>

        {/* OAuth */}
        <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Social Login</h2>
            <p className="text-xs text-white/40 mt-0.5">Toggle social providers — powered by AuthKit's own OAuth apps, no setup needed.</p>
          </div>
          <div className="space-y-2">
            {oauthProviders.map(p => (
              <div key={p.provider} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  {p.provider === "google" ? (
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">{p.provider}</p>
                    <p className="text-[11px] text-white/30">Managed by AuthKit</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleOAuth(p.provider, !p.enabled)}
                  disabled={togglingOAuth === p.provider}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 ${p.enabled ? "bg-violet-600" : "bg-white/10"}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${p.enabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Users */}
        <section className="border border-white/[0.07] rounded-2xl p-6 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Users</h2>
              <p className="text-sm text-white/40 mt-0.5">{app._count?.users ?? 0} total users</p>
            </div>
            <Link href={`/dashboard/apps/${appId}/users`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Manage users →</Link>
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

      </main>
    </div>
  );
}
