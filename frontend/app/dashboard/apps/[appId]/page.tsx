"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getApplication,
  updateApplication,
  rotateSecretKey,
  rotateWebhookSecret,
  deleteApplication,
  listOAuthProviders,
  upsertOAuthProvider,
  deleteOAuthProvider,
  Application,
  OAuthProvider,
} from "../../../../lib/dashboard";

// ── Shared key field ──────────────────────────────────────────────────────────

function KeyField({
  label,
  value,
  secret,
  masked,
}: {
  label: string;
  value: string;
  secret?: boolean;
  masked?: string;
}) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-gray-700 truncate">
          {revealed ? value : (masked ?? "•".repeat(32))}
        </code>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── OAuth provider icon ───────────────────────────────────────────────────────

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google")
    return <span className="text-lg">G</span>;
  return <span className="text-lg">⌥</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // Name editing
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Webhook URL editing
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [rotatingWebhook, setRotatingWebhook] = useState(false);

  // Key rotation / deletion
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // OAuth providers
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
        const [data, providers] = await Promise.all([
          getApplication(appId),
          listOAuthProviders(appId),
        ]);
        setApp(data);
        setName(data.name);
        setWebhookUrl(data.webhookUrl ?? "");
        setOauthProviders(providers);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId, router]);

  // ── Name ──────────────────────────────────────────────────────────────────

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateApplication(appId, { name });
      setApp((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Secret key ────────────────────────────────────────────────────────────

  async function handleRotate() {
    if (!confirm("Rotate secret key? Existing integrations will break until updated.")) return;
    setRotating(true);
    try {
      const newKey = await rotateSecretKey(appId);
      setApp((prev) => (prev ? { ...prev, secretKey: newKey } : prev));
    } finally {
      setRotating(false);
    }
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSavingWebhook(true);
    try {
      await updateApplication(appId, { webhookUrl: webhookUrl || null });
      setApp((prev) => (prev ? { ...prev, webhookUrl } : prev));
      setEditingWebhook(false);
    } finally {
      setSavingWebhook(false);
    }
  }

  async function handleRotateWebhookSecret() {
    if (!confirm("Rotate webhook secret? Update your webhook handler to use the new secret.")) return;
    setRotatingWebhook(true);
    try {
      const newSecret = await rotateWebhookSecret(appId);
      setApp((prev) => (prev ? { ...prev, webhookSecret: newSecret } : prev));
    } finally {
      setRotatingWebhook(false);
    }
  }

  // ── OAuth providers ───────────────────────────────────────────────────────

  async function handleSaveOAuth(e: React.FormEvent) {
    e.preventDefault();
    setSavingOAuth(true);
    try {
      const saved = await upsertOAuthProvider(appId, oauthForm);
      setOauthProviders((prev) => {
        const idx = prev.findIndex((p) => p.provider === saved.provider);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setShowOAuthForm(false);
      setOauthForm({ provider: "google", clientId: "", clientSecret: "" });
    } finally {
      setSavingOAuth(false);
    }
  }

  async function handleRemoveOAuth(provider: string) {
    if (!confirm(`Remove ${provider} OAuth? Users who signed in via ${provider} won't be affected, but new sign-ins will fail.`)) return;
    setRemovingProvider(provider);
    try {
      await deleteOAuthProvider(appId, provider);
      setOauthProviders((prev) => prev.filter((p) => p.provider !== provider));
    } finally {
      setRemovingProvider(null);
    }
  }

  // ── Delete app ────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirm(`Delete "${app?.name}"? This permanently deletes all users and sessions.`)) return;
    setDeleting(true);
    try {
      await deleteApplication(appId);
      router.replace("/dashboard");
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  const configuredProviders = new Set(oauthProviders.map((p) => p.provider));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
          ← Applications
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">{app.name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* App name */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Application name</h2>
          {editing ? (
            <form onSubmit={handleSaveName} className="flex gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setName(app.name); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-700">{app.name}</p>
              <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 hover:underline">
                Edit
              </button>
            </div>
          )}
        </section>

        {/* API Keys */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">API Keys</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Use the publishable key in your frontend, secret key in your backend only.
            </p>
          </div>
          <div className="space-y-3">
            <KeyField label="Publishable key" value={app.publishableKey} />
            {app.secretKey && (
              <KeyField label="Secret key" value={app.secretKey} secret masked={"sk_live_" + "•".repeat(24)} />
            )}
          </div>
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="mt-4 text-sm text-amber-600 hover:underline disabled:opacity-50"
          >
            {rotating ? "Rotating..." : "Rotate secret key"}
          </button>
        </section>

        {/* Webhooks */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Webhooks</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Receive events when users sign up, sign in, get banned, or are deleted.
            </p>
          </div>

          {/* Webhook URL */}
          {editingWebhook ? (
            <form onSubmit={handleSaveWebhook} className="flex gap-3 mb-4">
              <input
                autoFocus
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://myapp.com/webhooks/auth"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={savingWebhook}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {savingWebhook ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setEditingWebhook(false); setWebhookUrl(app.webhookUrl ?? ""); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {app.webhookUrl ? (
                  <span className="font-mono">{app.webhookUrl}</span>
                ) : (
                  <span className="text-gray-400 italic">No webhook URL set</span>
                )}
              </p>
              <button
                onClick={() => setEditingWebhook(true)}
                className="text-sm text-indigo-600 hover:underline shrink-0 ml-4"
              >
                {app.webhookUrl ? "Edit" : "Add URL"}
              </button>
            </div>
          )}

          {/* Webhook secret */}
          {app.webhookSecret && (
            <div className="space-y-3">
              <KeyField
                label="Webhook signing secret"
                value={app.webhookSecret}
                secret
                masked={"whsec_" + "•".repeat(24)}
              />
              <button
                onClick={handleRotateWebhookSecret}
                disabled={rotatingWebhook}
                className="text-sm text-amber-600 hover:underline disabled:opacity-50"
              >
                {rotatingWebhook ? "Rotating..." : "Rotate webhook secret"}
              </button>
            </div>
          )}

          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Events fired</p>
            <div className="flex flex-wrap gap-1.5">
              {["user.created", "user.signed_in", "user.banned", "user.unbanned", "user.deleted"].map((e) => (
                <span key={e} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* OAuth Providers */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">OAuth Providers</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Allow users to sign in with Google or GitHub.
              </p>
            </div>
            {!showOAuthForm && (
              <button
                onClick={() => setShowOAuthForm(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                + Add provider
              </button>
            )}
          </div>

          {/* Configured providers */}
          {oauthProviders.length > 0 && (
            <div className="space-y-2 mb-4">
              {oauthProviders.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                      <ProviderIcon provider={p.provider} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{p.provider}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.clientId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      onClick={() => {
                        setOauthForm({ provider: p.provider, clientId: p.clientId, clientSecret: "" });
                        setShowOAuthForm(true);
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveOAuth(p.provider)}
                      disabled={removingProvider === p.provider}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/edit provider form */}
          {showOAuthForm && (
            <form onSubmit={handleSaveOAuth} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={oauthForm.provider}
                  onChange={(e) => setOauthForm((f) => ({ ...f, provider: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="google">Google</option>
                  <option value="github">GitHub</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                <input
                  required
                  value={oauthForm.clientId}
                  onChange={(e) => setOauthForm((f) => ({ ...f, clientId: e.target.value }))}
                  placeholder="Your OAuth app's Client ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Client Secret {configuredProviders.has(oauthForm.provider as "google" | "github") && (
                    <span className="text-gray-400">(leave blank to keep existing)</span>
                  )}
                </label>
                <input
                  type="password"
                  required={!configuredProviders.has(oauthForm.provider as "google" | "github")}
                  value={oauthForm.clientSecret}
                  onChange={(e) => setOauthForm((f) => ({ ...f, clientSecret: e.target.value }))}
                  placeholder="Your OAuth app's Client Secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium mb-1">Callback URL to register</p>
                <code className="text-xs text-blue-800 font-mono">
                  {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/oauth/{oauthForm.provider}/callback
                </code>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingOAuth}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {savingOAuth ? "Saving..." : "Save provider"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOAuthForm(false); setOauthForm({ provider: "google", clientId: "", clientSecret: "" }); }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {oauthProviders.length === 0 && !showOAuthForm && (
            <p className="text-sm text-gray-400 italic">No OAuth providers configured.</p>
          )}
        </section>

        {/* Users quick link */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Users</h2>
              <p className="text-sm text-gray-500 mt-0.5">{app._count?.users ?? 0} total users</p>
            </div>
            <Link
              href={`/dashboard/apps/${appId}/users`}
              className="text-sm text-indigo-600 hover:underline"
            >
              Manage users →
            </Link>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-white border border-red-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete this application and all its users.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete application"}
          </button>
        </section>

      </main>
    </div>
  );
}
