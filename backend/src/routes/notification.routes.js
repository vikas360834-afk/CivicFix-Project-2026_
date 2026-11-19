import { Router } from "express";
import prisma from "../config/prisma.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 15);
    const notifications = [];
    const user = req.user;

    if (user?.role === "ADMIN") {
      // Pending issues awaiting admin action
      const pending = await prisma.issue.findMany({
        where: { status: "PENDING_APPROVAL" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, ward: true, createdAt: true, priority: true },
      });

      pending.forEach((i) => {
        notifications.push({
          id: `pending-${i.id}`,
          title: `Pending Approval: #${i.id} ${i.title}`,
          message: `Priority: ${i.priority} · ${i.ward || "City"}`,
          time: i.createdAt,
          link: `/admin?tab=pending`,
          type: "warning",
          unread: true,
        });
      });
    } else if (user?.role === "ENGINEER") {
      // Assigned tasks for this engineer
      const tasks = await prisma.issue.findMany({
        where: { assignedToId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, priority: true, updatedAt: true },
      });

      tasks.forEach((i) => {
        notifications.push({
          id: `task-${i.id}`,
          title: `Task #${i.id}: ${i.title}`,
          message: `Status: ${i.status.replace("_", " ")} · Priority: ${i.priority}`,
          time: i.updatedAt,
          link: `/engineer`,
          type: "info",
          unread: true,
        });
      });
    } else if (user?.role === "USER") {
      // Status changes on user's reported issues
      const myIssues = await prisma.issue.findMany({
        where: { userId: user.id },
        take: 6,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, updatedAt: true },
      });

      myIssues.forEach((i) => {
        notifications.push({
          id: `issue-${i.id}`,
          title: `Issue #${i.id} is now ${i.status.replace("_", " ")}`,
          message: i.title,
          time: i.updatedAt,
          link: `/issues/${i.id}`,
          type: i.status === "RESOLVED" || i.status === "CLOSED" ? "success" : "info",
          unread: false,
        });
      });
    }

    // Recent activity stream fallback so there are always notifications
    if (notifications.length === 0) {
      const recent = await prisma.issue.findMany({
        where: { status: { in: ["OPEN", "RESOLVED", "IN_PROGRESS"] } },
        take: 4,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, ward: true, updatedAt: true },
      });

      recent.forEach((i) => {
        notifications.push({
          id: `feed-${i.id}`,
          title: `Issue #${i.id} updated: ${i.status}`,
          message: `${i.title} (${i.ward || "City"})`,
          time: i.updatedAt,
          link: `/issues/${i.id}`,
          type: "info",
          unread: false,
        });
      });
    }

    res.json({
      notifications: notifications.slice(0, limit),
      unreadCount: notifications.filter((n) => n.unread).length,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/read-all", optionalAuth, (req, res) => {
  res.json({ ok: true, message: "Notifications marked as read" });
});

export default router;
