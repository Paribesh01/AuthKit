import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import v1Routes from "./routes/v1.routes";
import { requireAuth } from "./middleware/auth.middleware";
import { apiLimiter } from "./middleware/rateLimiter";
import { enforceAllowedOrigins } from "./middleware/originCheck";

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Let the frontend set its own CSP
  crossOriginEmbedderPolicy: false,
}));

// Disable X-Powered-By to avoid fingerprinting
app.disable("x-powered-by");

// ── CORS ──────────────────────────────────────────────────────────────────────
// /v1 — called by developers' frontend apps from any origin
app.use(
  "/v1",
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization", "x-publishable-key", "x-refresh-token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Dashboard & auth — restrict to same origin in production
const allowedDashboardOrigins = process.env.ALLOWED_DASHBOARD_ORIGINS
  ? process.env.ALLOWED_DASHBOARD_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser requests (curl, server-to-server)
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (allowedDashboardOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "512kb" })); // Limit request body size
app.use(cookieParser());

// ── Global rate limit on all API endpoints ────────────────────────────────────
app.use("/v1", apiLimiter);
app.use("/api", apiLimiter);

// ── Allowed origins enforcement on v1 ────────────────────────────────────────
app.use("/v1", enforceAllowedOrigins);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/v1", v1Routes);

// ── 404 fallthrough ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
  console.log(`  Dashboard API  → /api/dashboard`);
  console.log(`  App Auth API   → /v1`);
});
