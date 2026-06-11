"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { refreshToken } from "../../../../lib/auth";
import {
  getApplication,
  updateApplication,
  rotateSecretKey,
  deleteApplication,
  Application,
} from "../../../../lib/dashboard";

function KeyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
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
          {revealed ? value : "sk_live_" + "•".repeat(24)}
        </code>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
        >
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
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        await refreshToken();
        const data = await getApplication(appId);
        setApp(data);
        setName(data.name);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId, router]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateApplication(appId, { name });
      setApp((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate() {
    if (!confirm("Rotate secret key? Your existing integrations will break until updated.")) return;
    setRotating(true);
    try {
      const newKey = await rotateSecretKey(appId);
      setApp((prev) => prev ? { ...prev, secretKey: newKey } : prev);
    } finally {
      setRotating(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${app?.name}"? This will permanently delete all users and sessions.`)) return;
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
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </section>

        {/* API Keys */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">API Keys</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Use the publishable key in your frontend, secret key in your backend only.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <KeyField label="Publishable key" value={app.publishableKey} />
            {app.secretKey && (
              <KeyField label="Secret key" value={app.secretKey} secret />
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

        {/* Users quick link */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Users</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {app._count?.users ?? 0} total users
              </p>
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
