import { Router } from "express";
import { getAuthAnalyticsOverview } from "../controllers/authAnalytics.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Only ADMIN can access authentication error analytics
router.get("/overview", authenticate, authorize("ADMIN"), getAuthAnalyticsOverview);

export default router;
