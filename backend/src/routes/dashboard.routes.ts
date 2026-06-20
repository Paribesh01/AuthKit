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
  revokeUserSessions,
} from "../controllers/dashboard/appUser.controller";
import {
  listOAuthProviders,
  upsertOAuthProvider,
  deleteOAuthProvider,
} from "../controllers/dashboard/oauthProvider.controller";

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
    body("webhookUrl").optional().isURL(),
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
    body("clientId").notEmpty(),
    body("clientSecret").optional().notEmpty(),
    body("enabled").optional().isBoolean(),
  ],
  validate,
  upsertOAuthProvider
);
router.delete("/applications/:appId/oauth-providers/:provider", deleteOAuthProvider);

// Users within an application
router.get("/applications/:appId/users", listUsers);
router.get("/applications/:appId/users/:userId", getUser);
router.post("/applications/:appId/users/:userId/ban", banUser);
router.post("/applications/:appId/users/:userId/unban", unbanUser);
router.delete("/applications/:appId/users/:userId", deleteUser);
router.delete("/applications/:appId/users/:userId/sessions", revokeUserSessions);

export default router;
