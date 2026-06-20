import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware";
import { requirePublishableKey, requireSecretKey } from "../middleware/apiKey.middleware";
import { initiateOAuth, oauthCallback } from "../controllers/v1/oauth.controller";
import {
  signUp,
  signIn,
  refreshSession,
  signOut,
  getMe,
  updateMyMetadata,
  verifyToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/v1/auth.controller";
import { updateUserMetadata, getUser as getAppUser } from "../controllers/v1/users.controller";
import { listSessions, revokeSession, revokeAllSessions } from "../controllers/v1/sessions.controller";

const router = Router();

// Public endpoints — authenticated by publishable key
// These are called from the developer's frontend
router.post(
  "/sign-up",
  requirePublishableKey,
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("username").optional().trim().isAlphanumeric(),
    body("password").optional().isLength({ min: 8 }),
    body("firstName").optional().trim(),
    body("lastName").optional().trim(),
  ],
  validate,
  signUp
);

router.post(
  "/sign-in",
  requirePublishableKey,
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("username").optional().trim(),
    body("password").notEmpty(),
  ],
  validate,
  signIn
);

router.post("/refresh", requirePublishableKey, refreshSession);
router.post("/sign-out", requirePublishableKey, signOut);

// me uses publishable key + the user's access token in Authorization header
router.get("/me", requirePublishableKey, getMe);

// Email verification (link from the verification email)
router.get("/verify-email/:token", verifyEmail);

// Password reset (called from the developer's app)
router.post(
  "/forgot-password",
  requirePublishableKey,
  [body("email").isEmail().normalizeEmail(), body("redirectUrl").optional().isURL()],
  validate,
  forgotPassword
);
router.post(
  "/reset-password",
  requirePublishableKey,
  [
    body("token").notEmpty(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  resetPassword
);

// OAuth — publishable key + redirect_url in query params (browser redirect flow)
router.get("/oauth/:provider", initiateOAuth);
router.get("/oauth/:provider/callback", oauthCallback);

// Session management (access token required)
router.get("/me/sessions", requirePublishableKey, listSessions);
router.delete("/me/sessions", requirePublishableKey, revokeAllSessions);
router.delete("/me/sessions/:sessionId", requirePublishableKey, revokeSession);

// Current user metadata (access token required)
router.patch(
  "/me/metadata",
  requirePublishableKey,
  [body("publicMetadata").isObject()],
  validate,
  updateMyMetadata
);

// Secret-key-only endpoints — called from developer's backend server
router.post("/verify-token", requireSecretKey, verifyToken);
router.get("/users/:userId", requireSecretKey, getAppUser);
router.patch(
  "/users/:userId/metadata",
  requireSecretKey,
  [
    body("publicMetadata").optional().isObject(),
    body("privateMetadata").optional().isObject(),
  ],
  validate,
  updateUserMetadata
);

export default router;
