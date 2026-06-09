import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware";
import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
} from "../controllers/auth.controller";

const router = Router();

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
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

export default router;
