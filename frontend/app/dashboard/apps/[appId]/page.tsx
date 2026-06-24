"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getApplication, updateApplication, rotateSecretKey, rotateWebhookSecret,
  deleteApplication, listOAuthProviders, upsertOAuthProvider, deleteOAuthProvider,
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
  const [showOAuthForm, setShowOAuthForm] = useState(false);
  const [oauthForm, setOauthForm] = useState({ provider: "google", clientId: "", clientSecret: "" });
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [removingProvider, setRemovingProvider] = useState<string | null>(null);
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
  async function handleSaveOAuth(e: React.FormEvent) {
    e.preventDefault(); setSavingOAuth(true);
    try {
      const saved = await upsertOAuthProvider(appId, oauthForm);
      setOauthProviders(prev => { const i = prev.findIndex(p => p.provider === saved.provider); if (i >= 0) { const n = [...prev]; n[i] = saved; return n; } return [...prev, saved]; });
      setShowOAuthForm(false); setOauthForm({ provider: "google", clientId: "", clientSecret: "" });
    } finally { setSavingOAuth(false); }
  }
  async function handleRemoveOAuth(provider: string) {
    if (!confirm(`Remove ${provider} OAuth?`)) return;
    setRemovingProvider(provider);
    try { await deleteOAuthProvider(appId, provider); setOauthProviders(p => p.filter(x => x.provider !== provider)); }
    finally { setRemovingProvider(null); }
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
  const configuredProviders = new Set(oauthProviders.map(p => p.provider));

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">OAuth Providers</h2>
              <p className="text-xs text-white/40 mt-0.5">Allow users to sign in with Google or GitHub.</p>
            </div>
            {!showOAuthForm && (
              <button onClick={() => setShowOAuthForm(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">+ Add provider</button>
            )}
          </div>
          {oauthProviders.length > 0 && (
            <div className="space-y-2 mb-4">
              {oauthProviders.map(p => (
                <div key={p.provider} className="flex items-center justify-between px-4 py-3 border border-white/[0.07] rounded-xl bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                      {p.provider === "google" ? "G" : "GH"}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{p.provider}</p>
                      <p className="text-[11px] text-white/30 font-mono">{p.clientId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.enabled ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-white/30 border border-white/10"}`}>
                      {p.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <button onClick={() => { setOauthForm({ provider: p.provider, clientId: p.clientId, clientSecret: "" }); setShowOAuthForm(true); }} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
                    <button onClick={() => handleRemoveOAuth(p.provider)} disabled={removingProvider === p.provider} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showOAuthForm && (
            <form onSubmit={handleSaveOAuth} className="border border-white/[0.07] rounded-xl p-4 space-y-3 bg-white/[0.02]">
              <div>
                <label className="block text-xs text-white/50 mb-1">Provider</label>
                <select value={oauthForm.provider} onChange={e => setOauthForm(f => ({ ...f, provider: e.target.value }))} className={inputCls}>
                  <option value="google">Google</option>
                  <option value="github">GitHub</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Client ID</label>
                <input required value={oauthForm.clientId} onChange={e => setOauthForm(f => ({ ...f, clientId: e.target.value }))} placeholder="Your OAuth Client ID" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Client Secret {configuredProviders.has(oauthForm.provider as "google" | "github") && <span className="text-white/25">(leave blank to keep existing)</span>}
                </label>
                <input type="password" required={!configuredProviders.has(oauthForm.provider as "google" | "github")} value={oauthForm.clientSecret} onChange={e => setOauthForm(f => ({ ...f, clientSecret: e.target.value }))} placeholder="Your OAuth Client Secret" className={inputCls} />
              </div>
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                <p className="text-[10px] text-violet-300/70 uppercase tracking-widest font-medium mb-1">Callback URL to register</p>
                <code className="text-xs text-violet-300 font-mono">
                  {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/oauth/{oauthForm.provider}/callback
                </code>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingOAuth} className={btnPrimary}>{savingOAuth ? "Saving..." : "Save provider"}</button>
                <button type="button" onClick={() => { setShowOAuthForm(false); setOauthForm({ provider: "google", clientId: "", clientSecret: "" }); }} className={btnGhost}>Cancel</button>
              </div>
            </form>
          )}
          {oauthProviders.length === 0 && !showOAuthForm && (
            <p className="text-sm text-white/25">No OAuth providers configured.</p>
          )}
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
