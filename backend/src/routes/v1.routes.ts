import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware";
import { requirePublishableKey, requireSecretKey } from "../middleware/apiKey.middleware";
import {
  signUp,
  signIn,
  refreshSession,
  signOut,
  getMe,
  verifyToken,
} from "../controllers/v1/auth.controller";

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

// Secret-key-only endpoints — called from developer's backend server
router.post("/verify-token", requireSecretKey, verifyToken);

export default router;
