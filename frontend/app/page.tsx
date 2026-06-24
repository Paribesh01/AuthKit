import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Email + Password Auth",
    desc: "Secure sign-up, sign-in, and password reset with bcrypt hashing and JWT sessions.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: "OAuth — Google & GitHub",
    desc: "Social login configured from the dashboard. No redirect logic to write.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Signed Webhooks",
    desc: "HMAC-SHA256 events fired on every user lifecycle action. Verify in one call.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "TypeScript SDK",
    desc: "React hooks, pre-built UI, Next.js middleware, and a server SDK. ESM + CJS.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Multi-Tenant",
    desc: "One service, unlimited apps. Each gets isolated keys, users, and configuration.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Session Management",
    desc: "List sessions per device, revoke one or sign out everywhere.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm bg-[#080808]/80 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">
            Auth<span className="text-violet-400">Kit</span>
          </span>
          <div className="flex items-center gap-2">
            <Link href="/docs" className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              Docs
            </Link>
            <Link href="/sign-in" className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              Sign in
            </Link>
            <Link href="/sign-up" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          v0.1.1 · Open source · Self-hosted
        </div>

        <h1 className="text-5xl sm:text-[64px] font-bold tracking-tight leading-[1.08] mb-6 animate-fade-in-up">
          Auth infrastructure
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            you actually own.
          </span>
        </h1>

        <p className="text-white/50 text-lg max-w-xl mx-auto mb-10 leading-relaxed animate-fade-in-up [animation-delay:100ms]">
          Drop-in authentication for any app. Multi-tenant, TypeScript-first, with OAuth, webhooks, and session management built in.
        </p>

        <div className="flex items-center justify-center gap-3 animate-fade-in-up [animation-delay:200ms]">
          <Link href="/sign-up" className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Start building →
          </Link>
          <Link href="/sign-in" className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all">
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Code block */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28 animate-fade-in-up [animation-delay:300ms]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="w-3 h-3 rounded-full bg-white/10" />
            <span className="w-3 h-3 rounded-full bg-white/10" />
            <span className="w-3 h-3 rounded-full bg-white/10" />
            <span className="ml-3 text-xs text-white/30 font-mono">middleware.ts</span>
          </div>
          <pre className="p-6 text-sm font-mono leading-7 overflow-x-auto">
            <span className="text-white/30">{"// Protect all routes in one line\n"}</span>
            <span className="text-violet-300">{"import"}</span>
            <span className="text-white/70">{" { authkitMiddleware } "}</span>
            <span className="text-violet-300">{"from"}</span>
            <span className="text-emerald-400">{' "@paribeshn/authkit/nextjs"\n\n'}</span>
            <span className="text-violet-300">{"export default"}</span>
            <span className="text-white/70">{" authkitMiddleware({\n"}</span>
            <span className="text-white/70">{"  secretKey: "}</span>
            <span className="text-amber-300">{"process.env.AUTH_SECRET_KEY"}</span>
            <span className="text-white/70">{",\n"}</span>
            <span className="text-white/70">{"  signInUrl: "}</span>
            <span className="text-emerald-400">{`"/sign-in"`}</span>
            <span className="text-white/70">{",\n})\n\n"}</span>
            <span className="text-violet-300">{"export const"}</span>
            <span className="text-white/70">{" config = { matcher: ["}</span>
            <span className="text-emerald-400">{"\"/((?!_next).*)\""}  </span>
            <span className="text-white/70">{"] }"}</span>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything you need</h2>
          <p className="text-white/40">No vendor lock-in. No per-MAU pricing. Just your server.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:bg-violet-500/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install strip */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-medium">Install</p>
            <code className="text-sm font-mono text-violet-300">npm install @paribeshn/authkit</code>
          </div>
          <div className="h-px sm:h-10 sm:w-px bg-white/[0.07] w-full sm:w-auto" />
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-medium">Entrypoints</p>
            <div className="flex flex-wrap gap-2">
              {["/react", "/nextjs", "/server"].map((e) => (
                <code key={e} className="text-xs font-mono bg-white/5 border border-white/[0.07] px-2 py-1 rounded-md text-white/50">
                  authkit{e}
                </code>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Up and running in minutes</h2>
          <p className="text-white/40">Three steps from zero to production auth.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Create an app", desc: "Register on the dashboard and create an application. Get your publishable and secret keys instantly." },
            { n: "02", title: "Install the SDK", desc: "Wrap your app in AuthProvider, add authkitMiddleware to protect routes, use useAuth() for state." },
            { n: "03", title: "Ship", desc: "Your users sign up, sign in, reset passwords, manage sessions — you manage them from the dashboard." },
          ].map((s) => (
            <div key={s.n} className="relative pl-5 border-l border-white/[0.07]">
              <span className="text-xs font-mono text-violet-400/60 mb-3 block">{s.n}</span>
              <h3 className="font-semibold mb-2 text-sm">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-transparent p-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-purple-600/10 to-violet-600/5" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-4">Ready to ship?</h2>
            <p className="text-white/50 mb-8 max-w-sm mx-auto">Create your account, make an app, copy your keys. That&apos;s it.</p>
            <Link
              href="/sign-up"
              className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-medium transition-colors text-sm"
            >
              Create free account →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/25">
          <span>
            Auth<span className="text-violet-400">Kit</span> — self-hosted auth
          </span>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-white/60 transition-colors">Docs</Link>
            <Link href="/sign-in" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-white/60 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
