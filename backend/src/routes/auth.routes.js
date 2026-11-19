import { Router } from "express";
import { body } from "express-validator";
import { register, login, logout, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/register",
  validate([
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ]),
  register
);

router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ]),
  login
);

router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;