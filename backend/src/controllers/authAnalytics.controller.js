import prisma from "../config/prisma.js";

const FAILURE_LABELS = {
  INCORRECT_PASSWORD: "Incorrect Password",
  INVALID_EMAIL: "Invalid Email Address",
  ROLE_MISMATCH: "Role Mismatch Tab Selection",
  ROLE_FORBIDDEN: "Forbidden Role Privilege Escalation",
  TOKEN_EXPIRED: "Session / Token Expired",
  INVALID_TOKEN: "Tampered or Invalid Signature",
  MISSING_TOKEN: "Unauthenticated Endpoint Access",
  EMAIL_ALREADY_EXISTS: "Duplicate Registration Attempt",
  USER_NOT_FOUND: "Account Revoked or Deleted",
};

export async function getAuthAnalyticsOverview(req, res, next) {
  try {
    const days = 14;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all logs
    const [allLogs, recentLogs] = await Promise.all([
      prisma.authLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          eventType: true,
          failureReason: true,
          createdAt: true,
          role: true,
        },
      }),
      prisma.authLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          eventType: true,
          email: true,
          role: true,
          failureReason: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
    ]);

    // KPI Totals
    let successfulLogins = 0;
    let failedLogins = 0;
    let newRegistrations = 0;
    let logouts = 0;
    let unauthorizedAttempts = 0;
    let expiredSessions = 0;

    const errorCounts = {};

    allLogs.forEach((log) => {
      if (log.eventType === "LOGIN_SUCCESS") successfulLogins++;
      else if (log.eventType === "LOGIN_FAILED") {
        failedLogins++;
        if (log.failureReason) {
          errorCounts[log.failureReason] = (errorCounts[log.failureReason] || 0) + 1;
        }
      } else if (log.eventType === "REGISTER_SUCCESS") newRegistrations++;
      else if (log.eventType === "LOGOUT") logouts++;
      else if (log.eventType === "UNAUTHORIZED_ACCESS") {
        unauthorizedAttempts++;
        if (log.failureReason) {
          errorCounts[log.failureReason] = (errorCounts[log.failureReason] || 0) + 1;
        }
      } else if (log.eventType === "SESSION_EXPIRED") {
        expiredSessions++;
        if (log.failureReason) {
          errorCounts[log.failureReason] = (errorCounts[log.failureReason] || 0) + 1;
        }
      }
    });

    const totalAuthAttempts = successfulLogins + failedLogins;
    const successRate = totalAuthAttempts > 0 ? ((successfulLogins / totalAuthAttempts) * 100).toFixed(1) : 100;

    // Pie Chart Data
    const pieData = [
      { name: "Successful Logins", value: successfulLogins, color: "#10B981" },
      { name: "Failed Logins", value: failedLogins, color: "#EF4444" },
      { name: "Unauthorized Attempts", value: unauthorizedAttempts, color: "#F59E0B" },
      { name: "Expired Sessions", value: expiredSessions, color: "#8B5CF6" },
    ].filter((p) => p.value > 0);

    // Daily Bar & Line Chart Buckets (14 days)
    const dayBuckets = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      dayBuckets[key] = {
        date: key,
        label,
        success: 0,
        failed: 0,
        unauthorized: 0,
        totalAttempts: 0,
      };
    }

    allLogs.forEach((l) => {
      const key = l.createdAt.toISOString().slice(0, 10);
      if (dayBuckets[key]) {
        if (l.eventType === "LOGIN_SUCCESS") {
          dayBuckets[key].success += 1;
          dayBuckets[key].totalAttempts += 1;
        } else if (l.eventType === "LOGIN_FAILED") {
          dayBuckets[key].failed += 1;
          dayBuckets[key].totalAttempts += 1;
        } else if (l.eventType === "UNAUTHORIZED_ACCESS") {
          dayBuckets[key].unauthorized += 1;
        }
      }
    });

    const dailyTrends = Object.values(dayBuckets);

    // Most Common Auth Errors Ranking
    const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0) || 1;
    const commonErrors = Object.entries(errorCounts)
      .map(([reason, count]) => ({
        reason,
        label: FAILURE_LABELS[reason] || reason,
        count,
        percentage: Math.round((count / totalErrors) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      summary: {
        totalAuthAttempts,
        successRate: Number(successRate),
        successfulLogins,
        failedLogins,
        unauthorizedAttempts,
        expiredSessions,
        newRegistrations,
        logouts,
      },
      pieData,
      dailyTrends,
      commonErrors,
      recentLogs: recentLogs.map((l) => ({
        ...l,
        labelReason: FAILURE_LABELS[l.failureReason] || l.failureReason,
      })),
    });
  } catch (err) {
    next(err);
  }
}
