import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight">
            Auth<span className="text-primary">Kit</span>
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity font-medium"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            v0.1.1 published on npm
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Auth infrastructure
            <br />
            you actually own.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg">
            Drop-in authentication for any app. Self-hosted, multi-tenant, with a TypeScript SDK that works with React and Next.js.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-up"
              className="bg-foreground text-background text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Start building
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Code block */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/30">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">middleware.ts</span>
          </div>
          <pre className="p-6 text-sm font-mono overflow-x-auto leading-6 text-foreground/80">
            <span className="text-muted-foreground">{"// Protect routes in one line\n"}</span>
            <span>{"import { authkitMiddleware } from "}</span>
            <span className="text-primary">{'"@paribeshn/authkit/nextjs"'}</span>
            {"\n\nexport default authkitMiddleware({\n  secretKey: "}
            <span className="text-primary">{"process.env.AUTH_SECRET_KEY"}</span>
            {",\n  signInUrl: "}
            <span className="text-primary">{'"/sign-in"'}</span>
            {",\n})\n\nexport const config = {\n  matcher: ["}
            <span className="text-primary">{'["/((?!_next|favicon.ico).*)"]'}</span>
            {"]\n}"}
          </pre>
        </div>
      </section>

      {/* Features — minimal list style */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10">
          {[
            {
              title: "Email + password auth",
              desc: "Sign-up, sign-in, email verification, and password reset — all included.",
            },
            {
              title: "OAuth — Google & GitHub",
              desc: "Social login configured from the dashboard. Callback handling built in.",
            },
            {
              title: "Signed webhooks",
              desc: "HMAC-SHA256 events on every user action. Verify with one SDK call.",
            },
            {
              title: "Multi-tenant by design",
              desc: "One service, unlimited apps. Each gets isolated keys, users, and config.",
            },
            {
              title: "TypeScript SDK",
              desc: "React hooks, pre-built components, Next.js middleware, server utilities.",
            },
            {
              title: "Session management",
              desc: "List sessions per device, revoke individually or sign out everywhere.",
            },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="border rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Install</p>
            <code className="text-sm font-mono">npm install @paribeshn/authkit</code>
          </div>
          <div className="h-px sm:h-12 sm:w-px bg-border w-full sm:w-auto" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Entrypoints</p>
            <div className="flex flex-wrap gap-2">
              {["@paribeshn/authkit/react", "@paribeshn/authkit/nextjs", "@paribeshn/authkit/server"].map((e) => (
                <code key={e} className="text-xs font-mono bg-muted px-2 py-1 rounded">{e}</code>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="border-t pt-12">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-10">How it works</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Create an app", desc: "Register on the dashboard and create an application. Copy your publishable and secret keys." },
              { n: "2", title: "Install the SDK", desc: "Wrap your app in AuthProvider, use useAuth() for state, and add authkitMiddleware to protect routes." },
              { n: "3", title: "Ship", desc: "Users sign up, sign in, and manage sessions. You manage them from the dashboard." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="text-xs font-mono text-muted-foreground mt-0.5 w-4 shrink-0">{s.n}.</span>
                <div>
                  <p className="text-sm font-semibold mb-1">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-medium">
            Auth<span className="text-primary">Kit</span>
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
