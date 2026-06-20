import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { register, login, refresh, logout, verifyEmail, getMe, forgotPassword, resetPassword } from "../controllers/auth.controller";

const router = Router();

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
  ],
  validate,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login
);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/verify-email/:token", verifyEmail);
router.get("/me", requireAuth, getMe);
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  validate,
  forgotPassword
);
router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  resetPassword
);

export default router;
