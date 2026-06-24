import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware";
import {
  listApplications,
  createApplication,
  getApplication,
  updateApplication,
  deleteApplication,
  rotateSecretKey,
  rotateWebhookSecret,
} from "../controllers/dashboard/application.controller";
import {
  listUsers,
  getUser,
  banUser,
  unbanUser,
  deleteUser,
  createUser,
  updateUserMetadata,
  revokeUserSessions,
} from "../controllers/dashboard/appUser.controller";
import {
  listOAuthProviders,
  upsertOAuthProvider,
  deleteOAuthProvider,
} from "../controllers/dashboard/oauthProvider.controller";
import { listEvents, getStats } from "../controllers/dashboard/appEvent.controller";
import { getSettings, updateSettings } from "../controllers/dashboard/appSettings.controller";
import { listUserSessions, revokeSession, getActivityChart } from "../controllers/dashboard/sessions.controller";

const router = Router();

// Applications
router.get("/applications", listApplications);

router.post(
  "/applications",
  [body("name").trim().notEmpty().withMessage("Name is required")],
  validate,
  createApplication
);

router.get("/applications/:appId", getApplication);

router.patch(
  "/applications/:appId",
  [
    body("name").optional().trim().notEmpty(),
    body("allowedOrigins").optional().isArray(),
    body("webhookUrl").optional({ nullable: true }).if(body("webhookUrl").notEmpty()).isURL(),
  ],
  validate,
  updateApplication
);

router.delete("/applications/:appId", deleteApplication);
router.post("/applications/:appId/rotate-key", rotateSecretKey);
router.post("/applications/:appId/rotate-webhook-secret", rotateWebhookSecret);

// OAuth providers for an application
router.get("/applications/:appId/oauth-providers", listOAuthProviders);
router.post(
  "/applications/:appId/oauth-providers",
  [
    body("provider").isIn(["google", "github"]),
    body("enabled").isBoolean(),
  ],
  validate,
  upsertOAuthProvider
);
router.delete("/applications/:appId/oauth-providers/:provider", deleteOAuthProvider);

// Events, stats, chart
router.get("/applications/:appId/stats", getStats);
router.get("/applications/:appId/events", listEvents);
router.get("/applications/:appId/chart", getActivityChart);

// App settings
router.get("/applications/:appId/settings", getSettings);
router.patch(
  "/applications/:appId/settings",
  [
    body("passwordMinLength").optional().isInt({ min: 6, max: 72 }),
    body("requireUppercase").optional().isBoolean(),
    body("requireNumber").optional().isBoolean(),
    body("requireEmailVerification").optional().isBoolean(),
    body("allowSignups").optional().isBoolean(),
    body("sessionDurationHours").optional().isInt({ min: 1, max: 8760 }),
    body("maxSessionsPerUser").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  updateSettings
);

// Users within an application
router.get("/applications/:appId/users", listUsers);
router.post(
  "/applications/:appId/users",
  [body("email").optional().isEmail(), body("password").optional().isLength({ min: 8 })],
  validate,
  createUser
);
router.get("/applications/:appId/users/:userId", getUser);
router.post("/applications/:appId/users/:userId/ban", banUser);
router.post("/applications/:appId/users/:userId/unban", unbanUser);
router.delete("/applications/:appId/users/:userId", deleteUser);
router.patch(
  "/applications/:appId/users/:userId/metadata",
  [
    body("publicMetadata").optional().isObject(),
    body("privateMetadata").optional().isObject(),
  ],
  validate,
  updateUserMetadata
);
router.delete("/applications/:appId/users/:userId/sessions", revokeUserSessions);
router.get("/applications/:appId/users/:userId/sessions", listUserSessions);
router.delete("/applications/:appId/sessions/:sessionId", revokeSession);

export default router;
