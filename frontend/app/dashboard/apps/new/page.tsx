"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createApplication } from "../../../../lib/dashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = "minimal" | "card" | "glass";

interface Config {
  name: string;
  email: boolean;
  phone: boolean;
  username: boolean;
  google: boolean;
  github: boolean;
  theme: Theme;
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-violet-600" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── Sign-in preview ───────────────────────────────────────────────────────────

const GOOGLE_ICON = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GITHUB_ICON = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

function SignInPreview({ config }: { config: Config }) {
  const hasSocial = config.google || config.github;
  const hasIdentifier = config.email || config.phone || config.username;
  const appName = config.name.trim() || "My Application";

  const wrapperCls = {
    minimal: "bg-[#0f0f0f] border border-white/[0.07] rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-black/60",
    card: "bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-black/40 ring-1 ring-white/5",
    glass: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-violet-900/20",
  }[config.theme];

  const btnCls = {
    minimal: "w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors",
    card: "w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 text-sm font-medium text-white transition-colors",
    glass: "w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors",
  }[config.theme];

  const inputCls = {
    minimal: "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all",
    card: "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all",
    glass: "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all",
  }[config.theme];

  const continueBtnCls = {
    minimal: "w-full bg-white text-black font-semibold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-white/90 transition-colors",
    card: "w-full bg-white text-black font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-white/90 transition-colors",
    glass: "w-full bg-violet-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-violet-500 transition-colors",
  }[config.theme];

  return (
    <div className={wrapperCls}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
          <span className="text-violet-400 font-bold text-sm">{appName[0].toUpperCase()}</span>
        </div>
        <h2 className="text-base font-semibold text-white">Sign in to {appName}</h2>
        <p className="text-xs text-white/40 mt-0.5">Welcome back! Please sign in to continue</p>
      </div>

      {/* Social buttons */}
      {hasSocial && (
        <div className="space-y-2 mb-4">
          {config.google && (
            <button className={btnCls}>
              {GOOGLE_ICON}
              <span>Continue with Google</span>
            </button>
          )}
          {config.github && (
            <button className={btnCls}>
              <span className="text-white/70">{GITHUB_ICON}</span>
              <span>Continue with GitHub</span>
            </button>
          )}
        </div>
      )}

      {/* Divider */}
      {hasSocial && hasIdentifier && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-xs text-white/25">or</span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>
      )}

      {/* Identifier field */}
      {hasIdentifier && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">
              {config.email && config.username ? "Email address or username"
                : config.email && config.phone ? "Email address or phone"
                : config.email ? "Email address"
                : config.username ? "Username"
                : "Phone number"}
            </label>
            <input
              className={inputCls}
              placeholder={
                config.email ? "Enter your email address"
                  : config.username ? "Enter your username"
                  : "Enter your phone number"
              }
              readOnly
            />
          </div>

          <button className={continueBtnCls}>
            Continue
            <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {!hasSocial && !hasIdentifier && (
        <div className="text-center py-4">
          <p className="text-xs text-white/25">Enable at least one sign-in method.</p>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-white/30 mt-5">
        Don&apos;t have an account?{" "}
        <span className="text-white/60 cursor-pointer hover:text-white transition-colors">Sign up</span>
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <svg className="w-3 h-3 text-white/20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l6 2.67V11c0 3.89-2.54 7.63-6 8.93-3.46-1.3-6-5.04-6-8.93V7.67L12 5z"/>
        </svg>
        <span className="text-[10px] text-white/20">Secured by AuthKit</span>
      </div>
    </div>
  );
}

// ── Theme mockup (simple schematic) ──────────────────────────────────────────

function ThemeMockup({ theme }: { theme: Theme }) {
  const s = {
    minimal: { bg: "bg-[#0f0f0f]", border: "border-white/10", r: "rounded-lg", btn: "bg-white", input: "bg-white/5 border-white/10" },
    card:    { bg: "bg-[#1c1c1c]", border: "border-white/10", r: "rounded-2xl", btn: "bg-white", input: "bg-white/5 border-white/10" },
    glass:   { bg: "bg-white/5 backdrop-blur",  border: "border-white/15", r: "rounded-2xl", btn: "bg-violet-600", input: "bg-white/8 border-white/15" },
  }[theme];

  return (
    <div className={`${s.bg} ${s.border} ${s.r} border w-full p-3 flex flex-col gap-1.5`}>
      <div className="w-5 h-5 rounded-lg bg-violet-500/30 mx-auto mb-1" />
      <div className="w-3/4 h-1.5 rounded-full bg-white/20 mx-auto" />
      <div className="w-1/2 h-1 rounded-full bg-white/10 mx-auto mb-1" />
      <div className={`${s.input} ${s.r} border h-4 w-full`} />
      <div className={`${s.input} ${s.r} border h-4 w-full`} />
      <div className={`${s.btn} ${s.r} h-5 w-full mt-0.5`} />
    </div>
  );
}

// ── Theme selector ────────────────────────────────────────────────────────────

function ThemeOption({ id, label, active, onClick }: {
  id: Theme; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-xl border p-3 text-left transition-all ${active ? "border-violet-500/50 bg-violet-500/10" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"}`}
    >
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <ThemeMockup theme={id} />
      <p className={`text-xs font-medium mt-2 ${active ? "text-violet-300" : "text-white/50"}`}>{label}</p>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SIGN_IN_TOGGLES = [
  { key: "email" as const, label: "Email", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )},
  { key: "phone" as const, label: "Phone number", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )},
  { key: "username" as const, label: "Username", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
  { key: "google" as const, label: "Google", icon: GOOGLE_ICON },
  { key: "github" as const, label: "GitHub", icon: (
    <span className="text-white/60">{GITHUB_ICON}</span>
  )},
];

export default function NewAppPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({
    name: "",
    email: true,
    phone: false,
    username: false,
    google: false,
    github: false,
    theme: "minimal",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    const name = config.name.trim();
    if (!name) { setError("Application name is required."); return; }
    setError("");
    setCreating(true);
    try {
      const app = await createApplication(name);
      router.push(`/dashboard/apps/${app.id}`);
    } catch {
      setError("Failed to create application. Please try again.");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] left-[40%] w-[700px] h-[500px] rounded-full bg-violet-600/8 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] px-6 py-4 flex items-center gap-4 bg-[#080808]/80 backdrop-blur-sm">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <span className="text-white/20">|</span>
        <span className="text-sm font-medium">Create application</span>
      </header>

      {/* Body */}
      <div className="relative z-10 flex flex-1">
        {/* Left panel */}
        <div className="w-[400px] shrink-0 border-r border-white/[0.06] overflow-y-auto p-8 flex flex-col gap-6">

          {/* App name */}
          <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Application name</p>
                <p className="text-xs text-white/30">We generated one for you. Change this now, or anytime.</p>
              </div>
            </div>
            <input
              autoFocus
              value={config.name}
              onChange={e => set("name", e.target.value)}
              placeholder="My Application"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>

          {/* Sign-in options */}
          <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Sign in options</p>
                <p className="text-xs text-white/30">You can change these anytime in the dashboard.</p>
              </div>
            </div>
            <div className="space-y-1">
              {SIGN_IN_TOGGLES.map(({ key, label, icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`transition-colors ${config[key] ? "text-white/70" : "text-white/25"}`}>{icon}</span>
                    <span className={`transition-colors ${config[key] ? "text-white/80" : "text-white/30"}`}>{label}</span>
                  </div>
                  <Toggle on={config[key] as boolean} onChange={v => set(key, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Theme picker */}
          <div className="border border-white/[0.07] rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Component theme</p>
                <p className="text-xs text-white/30">Choose a style for your sign-in component.</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(["minimal", "card", "glass"] as Theme[]).map(t => (
                <ThemeOption
                  key={t}
                  id={t}
                  label={t.charAt(0).toUpperCase() + t.slice(1)}
                  active={config.theme === t}
                  onClick={() => set("theme", t)}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating...
              </>
            ) : (
              <>
                Create application
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Right — live preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6">
          <div className="text-center mb-2">
            <p className="text-xs text-white/25 uppercase tracking-widest font-medium">Live preview</p>
          </div>

          {/* Dotted bg */}
          <div className="relative w-full max-w-lg flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-3xl opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative z-10 w-full flex justify-center py-12 px-6">
              <SignInPreview config={config} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Toggle options on the left to update this preview in real-time
          </div>
        </div>
      </div>
    </div>
  );
}
