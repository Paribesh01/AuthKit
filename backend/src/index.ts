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
// Allow all origins — endpoints are protected by JWT auth, not CORS.
// CORS is a browser hint, not a real security boundary for APIs.
const corsOptions = {
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization", "x-publishable-key", "x-refresh-token"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

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
