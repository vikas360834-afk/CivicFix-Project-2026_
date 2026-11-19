import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { logAuthEvent } from "../utils/authLogger.js";

/** Verify Bearer JWT and attach req.user */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      logAuthEvent({
        eventType: "UNAUTHORIZED_ACCESS",
        failureReason: "MISSING_TOKEN",
        req,
      });
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, ward: true },
    });
    if (!user) {
      logAuthEvent({
        eventType: "UNAUTHORIZED_ACCESS",
        failureReason: "USER_NOT_FOUND",
        req,
      });
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    logAuthEvent({
      eventType: isExpired ? "SESSION_EXPIRED" : "UNAUTHORIZED_ACCESS",
      failureReason: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      req,
    });
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Restrict route to one or more roles */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      logAuthEvent({
        eventType: "UNAUTHORIZED_ACCESS",
        failureReason: "AUTHENTICATION_REQUIRED",
        req,
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      logAuthEvent({
        eventType: "UNAUTHORIZED_ACCESS",
        email: req.user.email,
        role: req.user.role,
        failureReason: "ROLE_FORBIDDEN",
        req,
      });
      return res.status(403).json({ error: "You do not have permission for this action" });
    }
    next();
  };
}

/** Optional auth - attach user if token present but don't require it */
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, ward: true },
    });
    if (user) req.user = user;
    next();
  } catch {
    next(); // invalid token = treat as guest
  }
}

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
