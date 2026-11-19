import { Router } from "express";
import { body } from "express-validator";
import { classify, chat } from "../controllers/ai.controller.js";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/classify",
  validate([body("description").trim().isLength({ min: 10 }).withMessage("Description too short to classify")]),
  classify
);

router.post(
  "/chat",
  optionalAuth,
  validate([body("message").trim().isLength({ min: 1 }).withMessage("Message is required")]),
  chat
);

export default router;