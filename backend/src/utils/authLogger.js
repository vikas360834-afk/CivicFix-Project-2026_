import prisma from "../config/prisma.js";

/**
 * Log an authentication event to the AuthLog table.
 * Strictly adheres to security rules: NEVER stores passwords, hashes, or tokens!
 */
export async function logAuthEvent({
  eventType,
  email = null,
  role = null,
  failureReason = null,
  req = null,
}) {
  try {
    const ipAddress =
      req?.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.socket?.remoteAddress ||
      "127.0.0.1";
    const userAgent = req?.headers["user-agent"]?.slice(0, 255) || null;
    const cleanEmail = email ? String(email).trim().toLowerCase().slice(0, 100) : null;

    await prisma.authLog.create({
      data: {
        eventType,
        email: cleanEmail,
        role: role || null,
        failureReason: failureReason || null,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
        userAgent,
      },
    });
  } catch (err) {
    console.warn("Failed to record auth log event:", err?.message || err);
  }
}
