"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, logout, Developer } from "../../lib/auth";
import { listApplications, createApplication, Application } from "../../lib/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function load() {
      try {
        const [dev, applications] = await Promise.all([getMe(), listApplications()]);
        setDeveloper(dev);
        setApps(applications);
      } catch {
        router.replace("/sign-in");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreating(true);
    try {
      const app = await createApplication(newAppName.trim());
      setApps((prev) => [app, ...prev]);
      setNewAppName("");
      setShowForm(false);
      router.push(`/dashboard/apps/${app.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/sign-in");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">AuthKit</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{developer?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
            <p className="text-sm text-gray-500 mt-1">
              Each application gets its own set of API keys and user database.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New application
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application name
              </label>
              <input
                autoFocus
                type="text"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="My App"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Apps grid */}
        {apps.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">No applications yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-indigo-600 text-sm hover:underline"
            >
              Create your first application
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/apps/${app.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {app.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-400">
                    {app._count?.users ?? 0} users
                  </span>
                </div>
                <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {app.name}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                  {app.publishableKey}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
