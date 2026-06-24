"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, logout, Developer } from "../../lib/auth";
import { listApplications, createApplication, Application } from "../../lib/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const router = useRouter();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/[0.06] flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <span className="font-semibold tracking-tight text-sm">
            Auth<span className="text-violet-400">Kit</span>
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="px-3 text-[10px] font-medium text-white/30 uppercase tracking-widest mb-2">
            Applications
          </p>
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <div className="w-5 h-5 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                {app.name[0].toUpperCase()}
              </div>
              <span className="truncate">{app.name}</span>
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-white/[0.06] space-y-0.5">
          <Link href="/docs" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.05] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Docs
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px] bg-violet-500/20 text-violet-400">
                {developer?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-white/30 truncate flex-1">{developer?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-white/[0.06] px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Applications</h1>
            <p className="text-sm text-white/40 mt-0.5">Each application gets its own keys and user database.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New application
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Create application</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="appName" className="text-white/70">Application name</Label>
                  <Input
                    id="appName"
                    autoFocus
                    placeholder="My App"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-white/50">Cancel</Button>
                  <Button type="submit" disabled={creating} className="bg-violet-600 hover:bg-violet-500 text-white border-0">
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="px-8 py-8">
          {apps.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="font-medium mb-1">No applications yet</p>
              <p className="text-sm text-white/40 mb-5">Create your first app to get started.</p>
              <Button onClick={() => setOpen(true)} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0">
                Create application
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {apps.map((app) => (
                <Link key={app.id} href={`/dashboard/apps/${app.id}`}>
                  <div className="group p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/30 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                        {app.name[0].toUpperCase()}
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-white/5 text-white/40 border-white/10">
                        {app._count?.users ?? 0} users
                      </Badge>
                    </div>
                    <p className="font-medium text-sm group-hover:text-violet-300 transition-colors mb-1">{app.name}</p>
                    <p className="text-[11px] text-white/30 font-mono truncate">{app.publishableKey}</p>
                    <Separator className="my-3 bg-white/[0.05]" />
                    <p className="text-[11px] text-white/30">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
