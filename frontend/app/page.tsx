import Link from "next/link";

const features = [
  {
    icon: "🔐",
    title: "Email + Password Auth",
    desc: "Secure sign-up and sign-in with bcrypt hashing and JWT sessions out of the box.",
  },
  {
    icon: "🔑",
    title: "OAuth — Google & GitHub",
    desc: "Social login with a single config. No redirect logic to write yourself.",
  },
  {
    icon: "🪝",
    title: "Webhooks",
    desc: "HMAC-signed events fired on every user lifecycle action. Verify in one line.",
  },
  {
    icon: "📦",
    title: "TypeScript SDK",
    desc: "React hooks, pre-built UI components, Next.js middleware, and a server SDK.",
  },
  {
    icon: "🏢",
    title: "Multi-Tenant",
    desc: "One service, unlimited apps. Each app gets its own keys, users, and config.",
  },
  {
    icon: "🛡️",
    title: "Session Management",
    desc: "List active sessions, revoke one device or all — with isCurrent detection.",
  },
];

const steps = [
  { step: "01", title: "Create an app", desc: "Register and create your first application in the dashboard. Get your publishable and secret keys instantly." },
  { step: "02", title: "Install the SDK", desc: "npm install authkit — wrap your app in AuthProvider, use useAuth() hook, done." },
  { step: "03", title: "Ship", desc: "Your users can sign up, sign in, reset passwords, and manage sessions. You manage them from the dashboard." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-white">Auth</span>
            <span className="text-indigo-400">Kit</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-28 pb-24 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            Open source · Self-hosted · Multi-tenant
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
            Authentication{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              without the lock-in
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            AuthKit is a self-hosted auth service. Drop the SDK into your app, point it at your instance, and get sign-in, OAuth, webhooks, and session management — all under your control.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Start for free →
            </Link>
            <Link
              href="/sign-in"
              className="border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Code snippet */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-white/30 font-mono">app/layout.tsx</span>
          </div>
          <pre className="p-6 text-sm font-mono text-white/70 overflow-x-auto leading-relaxed">
{`import { AuthProvider } from "authkit/react";

export default function Layout({ children }) {
  return (
    <AuthProvider
      publishableKey={`}
            <span className="text-indigo-400">{`process.env.NEXT_PUBLIC_PK`}</span>
            {`}
      baseUrl={`}
            <span className="text-indigo-400">{`process.env.NEXT_PUBLIC_API_URL`}</span>
            {`}
    >
      {children}
    </AuthProvider>
  );
}`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Everything you need</h2>
          <p className="text-center text-white/40 mb-14">No external auth vendor. No per-MAU pricing. Just your server.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Up and running in minutes</h2>
          <p className="text-center text-white/40 mb-14">Three steps from zero to auth.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-bold text-white/5 mb-4">{s.step}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK callout */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-8">
            <div className="text-2xl mb-3">⚛️</div>
            <h3 className="font-semibold text-lg mb-2">React</h3>
            <p className="text-sm text-white/50 mb-4">useAuth, useUser, SignedIn, SignedOut — plus pre-built SignIn / SignUp forms with no CSS dependencies.</p>
            <code className="text-xs text-indigo-300 font-mono">import {"{ useAuth }"} from "authkit/react"</code>
          </div>
          <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-8">
            <div className="text-2xl mb-3">▲</div>
            <h3 className="font-semibold text-lg mb-2">Next.js</h3>
            <p className="text-sm text-white/50 mb-4">Edge-compatible middleware for protecting routes. getUserFromRequest for server components and API routes.</p>
            <code className="text-xs text-violet-300 font-mono">import {"{ authkitMiddleware }"} from "authkit/nextjs"</code>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-b from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-3xl px-8 py-16">
          <h2 className="text-4xl font-bold mb-4">Ready to ship?</h2>
          <p className="text-white/50 mb-8">Create your account, make an app, copy your keys. That&apos;s it.</p>
          <Link
            href="/sign-up"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Create free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <span>
            <span className="text-white/60">Auth</span>
            <span className="text-indigo-400">Kit</span>
            {" "}— self-hosted auth service
          </span>
          <div className="flex gap-6">
            <Link href="/sign-in" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-white/60 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
