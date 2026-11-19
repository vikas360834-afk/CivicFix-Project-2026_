import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import userRoutes from "./routes/user.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import authAnalyticsRoutes from "./routes/authAnalytics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";

// Fail fast at startup if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}

export const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

// Security headers with Helmet
app.use(helmet());

// General API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests. Please try again later." },
});
app.use(limiter);

// Rate limiter for login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});
app.use("/api/auth/login", authLimiter);

// Rate limiter for AI chat
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Chat rate limit reached. Please wait a moment." },
});
app.use("/api/ai/chat", chatLimiter);

// Permissive local CORS for development (supports localhost, 127.0.0.1, LAN IPs)
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*") ||
        /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      // Never throw an uncaught Error — gracefully disallow
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Uploaded issue photos (saved under backend/uploads)
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", name: "CivicFix API", version: "2.0.0", timestamp: new Date().toISOString() })
);

app.get("/", (req, res) =>
  res.json({ name: "CivicFix API", version: "2.0.0", docs: "/api" })
);

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/auth-analytics", authAnalyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
// Comment routes are mounted under /api/issues/:id/comments
app.use("/api", commentRoutes);

app.use(notFound);
app.use(errorHandler);