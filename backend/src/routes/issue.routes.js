import { Router } from "express";
import {
  createIssue,
  listIssues,
  getIssue,
  updateIssue,
  updateStatus,
  deleteIssue,
  toggleUpvote,
  myIssues,
  pendingIssues,
  assignedIssues,
  getIssueHistory,
  approveIssue,
  rejectIssue,
  assignIssue,
  verifyIssue,
  checkDuplicateIssue,
} from "../controllers/issue.controller.js";
import { addImages, removeImage, uploadImagesMw } from "../controllers/image.controller.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { issueValidators } from "./validators.js";

const router = Router();

// Named routes must come before parameterized :id routes
router.get("/", optionalAuth, listIssues);
router.get("/mine", authenticate, myIssues);
router.get("/pending", authenticate, authorize("ADMIN"), pendingIssues);
router.get("/assigned", authenticate, authorize("ENGINEER"), assignedIssues);
router.post("/check-duplicate", optionalAuth, checkDuplicateIssue);

router.get("/:id", optionalAuth, getIssue);
router.get("/:id/history", authenticate, getIssueHistory);

router.post("/", authenticate, validate(issueValidators), createIssue);
router.put("/:id", authenticate, validate(issueValidators), updateIssue);

router.patch("/:id/approve", authenticate, authorize("ADMIN"), approveIssue);
router.patch("/:id/reject", authenticate, authorize("ADMIN"), rejectIssue);
router.patch("/:id/assign", authenticate, authorize("ADMIN"), assignIssue);
router.patch("/:id/verify", authenticate, verifyIssue);
router.patch("/:id/status", authenticate, authorize("ENGINEER", "ADMIN"), updateStatus);

router.delete("/:id", authenticate, deleteIssue);
router.post("/:id/upvote", authenticate, toggleUpvote);

router.post("/:id/images", authenticate, uploadImagesMw, addImages);
router.delete("/:id/images/:imageId", authenticate, removeImage);

export default router;