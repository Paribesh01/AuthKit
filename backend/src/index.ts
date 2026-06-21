import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import v1Routes from "./routes/v1.routes";
import { requireAuth } from "./middleware/auth.middleware";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
// /v1 — used by developers' apps from any origin (publishable key is the auth mechanism)
app.use(
  "/v1",
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization", "x-publishable-key", "x-refresh-token"],
  })
);

// /api — developer dashboard, restricted to our own frontend
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// Developer dashboard auth
app.use("/api/auth", authRoutes);

// Developer dashboard — protected, requires developer JWT
app.use("/api/dashboard", requireAuth, dashboardRoutes);

// Auth service API — called by developers' apps
app.use("/v1", v1Routes);

app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
  console.log(`  Dashboard API  → /api/dashboard`);
  console.log(`  App Auth API   → /v1`);
});
