import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

/** Shared validators for issue creation/update */
export const issueValidators = [
  body("title").trim().isLength({ min: 5, max: 120 }).withMessage("Title must be 5–120 characters"),
  body("description").trim().isLength({ min: 20, max: 2000 }).withMessage("Description must be at least 20 characters"),
  body("location").trim().isLength({ min: 3 }).withMessage("Location is required"),
];

export const validateIssue = validate(issueValidators);