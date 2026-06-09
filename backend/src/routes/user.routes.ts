import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  getMe,
  updateMe,
  getSessions,
  revokeSession,
} from "../controllers/user.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);

router.patch(
  "/me",
  [
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("username").optional().trim().isAlphanumeric(),
  ],
  validate,
  updateMe
);

router.get("/me/sessions", getSessions);
router.delete("/me/sessions/:sessionId", revokeSession);

export default router;
