import { Router } from "express";
import { body } from "express-validator";
import { listComments, addComment } from "../controllers/comment.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/issues/:id/comments", authenticate, listComments);
router.post(
  "/issues/:id/comments",
  authenticate,
  validate([body("body").trim().isLength({ min: 1, max: 1000 }).withMessage("Comment is required")]),
  addComment
);

export default router;