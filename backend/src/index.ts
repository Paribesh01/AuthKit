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
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token", "x-publishable-key"],
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
