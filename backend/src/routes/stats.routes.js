import { Router } from "express";
import {
  overview,
  byCategory,
  byStatus,
  byWard,
  trend,
  insights,
  departmentPerformance,
  weeklyTrend,
  leaderboard,
  activityLogs,
} from "../controllers/stats.controller.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", optionalAuth, overview);
router.get("/category", optionalAuth, byCategory);
router.get("/status", optionalAuth, byStatus);
router.get("/ward", optionalAuth, byWard);
router.get("/trend", optionalAuth, trend);
router.get("/insights", optionalAuth, insights);
router.get("/departments", optionalAuth, departmentPerformance);
router.get("/weekly", optionalAuth, weeklyTrend);
router.get("/leaderboard", optionalAuth, leaderboard);
router.get("/activity-logs", optionalAuth, activityLogs);

export default router;