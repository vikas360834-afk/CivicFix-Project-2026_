import prisma from "../config/prisma.js";

/**
 * Shared filters: category, status, ward, priority, from, to
 * Role-scoped stats:
 * - Admin sees city-wide numbers
 * - User sees their own reports (userId = user.id)
 * - Engineer sees their workload (assignedToId = user.id)
 */
function buildWhere(query, user) {
  const where = {};
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;
  if (query.ward) where.ward = query.ward;
  if (query.priority) where.priority = query.priority;

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  // Role scoping:
  if (user) {
    if (user.role === "USER") {
      where.userId = user.id;
    } else if (user.role === "ENGINEER") {
      where.assignedToId = user.id;
    } else if (user.role === "ADMIN") {
      if (query.userId) where.userId = parseInt(query.userId, 10);
      if (query.assignedToId) where.assignedToId = parseInt(query.assignedToId, 10);
    }
  }

  return where;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function overview(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const [total, pending, open, assigned, inProgress, resolved, rejected, closed, resolvedWithinMonth] =
      await Promise.all([
        prisma.issue.count({ where }),
        prisma.issue.count({ where: { ...where, status: "PENDING_APPROVAL" } }),
        prisma.issue.count({ where: { ...where, status: "OPEN" } }),
        prisma.issue.count({ where: { ...where, status: "ASSIGNED" } }),
        prisma.issue.count({ where: { ...where, status: "IN_PROGRESS" } }),
        prisma.issue.count({ where: { ...where, status: "RESOLVED" } }),
        prisma.issue.count({ where: { ...where, status: "REJECTED" } }),
        prisma.issue.count({ where: { ...where, status: "CLOSED" } }),
        prisma.issue.count({
          where: {
            ...where,
            status: "RESOLVED",
            resolvedAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
        }),
      ]);

    // Average resolution time (days) for resolved issues in scope
    const resolvedIssues = await prisma.issue.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    const avgDays = resolvedIssues.length
      ? resolvedIssues.reduce((s, i) => s + (i.resolvedAt - i.createdAt) / 86400000, 0) / resolvedIssues.length
      : 0;

    res.json({
      total,
      pending,
      open,
      assigned,
      inProgress,
      resolved,
      rejected,
      closed,
      byStatus: {
        PENDING_APPROVAL: pending,
        OPEN: open,
        ASSIGNED: assigned,
        IN_PROGRESS: inProgress,
        RESOLVED: resolved,
        REJECTED: rejected,
        CLOSED: closed,
      },
      resolvedRate: total ? Math.round((resolved / total) * 1000) / 10 : 0,
      avgResolutionDays: Math.round(avgDays * 10) / 10,
      resolvedLast30Days: resolvedWithinMonth,
      scopeRole: req.user?.role || "GUEST",
    });
  } catch (err) {
    next(err);
  }
}

export async function byCategory(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const rows = await prisma.issue.findMany({
      where,
      select: { category: true, status: true },
    });
    const counts = {};
    for (const r of rows) {
      counts[r.category] ||= { category: r.category, count: 0, resolved: 0 };
      counts[r.category].count += 1;
      if (r.status === "RESOLVED" || r.status === "CLOSED") counts[r.category].resolved += 1;
    }
    res.json({ categories: Object.values(counts).sort((a, b) => b.count - a.count) });
  } catch (err) {
    next(err);
  }
}

export async function byStatus(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const rows = await prisma.issue.findMany({ where, select: { status: true } });
    const counts = {
      PENDING_APPROVAL: 0,
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
    res.json({ statuses: Object.entries(counts).map(([status, count]) => ({ status, count })) });
  } catch (err) {
    next(err);
  }
}

export async function byWard(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    delete where.ward; // don't self-filter on ward for ward breakdown
    const rows = await prisma.issue.findMany({ where, select: { ward: true, status: true } });
    const counts = {};
    for (const r of rows) {
      const ward = r.ward || "Unassigned";
      counts[ward] ||= { ward, count: 0, resolved: 0 };
      counts[ward].count += 1;
      if (r.status === "RESOLVED" || r.status === "CLOSED") counts[ward].resolved += 1;
    }
    res.json({ wards: Object.values(counts).sort((a, b) => b.count - a.count) });
  } catch (err) {
    next(err);
  }
}

export async function trend(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const rows = await prisma.issue.findMany({
      where,
      select: { createdAt: true, resolvedAt: true, status: true },
    });

    const months = {};
    for (const r of rows) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
      months[key] ||= {
        period: key,
        label: `${MONTHS[r.createdAt.getMonth()]} ${r.createdAt.getFullYear()}`,
        count: 0,
        resolved: 0,
      };
      months[key].count += 1;
      if (r.resolvedAt) months[key].resolved += 1;
    }
    res.json({
      trend: Object.values(months).sort((a, b) => a.period.localeCompare(b.period)),
    });
  } catch (err) {
    next(err);
  }
}

export async function insights(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const [total, priorityRows, topCount, byCategoryRows] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({ where, select: { priority: true } }),
      prisma.issue.findMany({
        where: { ...where, status: { in: ["OPEN", "IN_PROGRESS", "ASSIGNED"] } },
        orderBy: { upvotes: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      prisma.issue.groupBy({
        by: ["category"],
        where,
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const avgPriority = priorityRows.length
      ? Object.keys(rank).sort((a, b) => rank[a] - rank[b])[
          Math.min(
            Math.floor(
              priorityRows.map((p) => rank[p.priority] ?? 2).reduce((s, r) => s + r, 0) / priorityRows.length
            ),
            Object.keys(rank).length - 1
          )
        ]
      : "N/A";

    res.json({
      total,
      avgPriority,
      topUrgent: topCount.map((i) => ({
        id: i.id,
        title: i.title,
        ward: i.ward,
        upvotes: i.upvotes,
        priority: i.priority,
        reporter: i.user?.name || "User",
      })),
      topCategories: byCategoryRows.map((g) => ({ category: g.category, count: g._count._all })),
    });
  } catch (err) {
    next(err);
  }
}

const DEPARTMENTS = [
  { key: "PWD", name: "Public Works Department (PWD)", categories: ["ROAD"] },
  { key: "Lighting", name: "Electrical & Lighting Division", categories: ["STREET_LIGHT"] },
  { key: "BWSSB", name: "Water Supply & Sewerage Board", categories: ["WATER"] },
  { key: "Sanitation", name: "Sanitation & Waste Management", categories: ["SANITATION"] },
  { key: "BESCOM", name: "Electricity Board (BESCOM)", categories: ["ELECTRICITY"] },
  { key: "Parks", name: "Horticulture / Parks Division", categories: ["PARK"] },
  { key: "Gas", name: "Gas & Utilities Department", categories: ["GAS"] },
  { key: "Admin", name: "General Administration", categories: ["OTHER"] },
];

export async function departmentPerformance(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    const issues = await prisma.issue.findMany({
      where,
      select: {
        category: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const engineers = await prisma.user.findMany({
      where: { role: "ENGINEER" },
      select: { id: true, department: true },
    });

    const perf = DEPARTMENTS.map((dept) => {
      const deptIssues = issues.filter((i) => dept.categories.includes(i.category));
      const total = deptIssues.length;
      const resolved = deptIssues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
      const inProgress = deptIssues.filter((i) => i.status === "IN_PROGRESS").length;
      const pending = deptIssues.filter((i) => i.status === "PENDING_APPROVAL" || i.status === "OPEN" || i.status === "ASSIGNED").length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      // Avg resolution time (hours)
      const resolvedList = deptIssues.filter((i) => i.resolvedAt);
      const avgHours = resolvedList.length > 0
        ? Math.round(resolvedList.reduce((acc, i) => acc + (new Date(i.resolvedAt) - new Date(i.createdAt)) / 3600000, 0) / resolvedList.length)
        : 0;

      return {
        name: dept.name,
        shortName: dept.key,
        total,
        resolved,
        inProgress,
        pending,
        resolutionRate: rate,
        avgHours,
      };
    });

    res.json({ departments: perf.sort((a, b) => b.total - a.total) });
  } catch (err) {
    next(err);
  }
}

export async function weeklyTrend(req, res, next) {
  try {
    const where = buildWhere(req.query, req.user);
    // Get last 14 days of data
    const days = 14;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const issues = await prisma.issue.findMany({
      where: {
        ...where,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, status: true, resolvedAt: true },
    });

    const dayBuckets = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      dayBuckets[key] = { date: key, label, reported: 0, resolved: 0 };
    }

    issues.forEach((iss) => {
      const cKey = iss.createdAt.toISOString().slice(0, 10);
      if (dayBuckets[cKey]) dayBuckets[cKey].reported += 1;
      if (iss.resolvedAt) {
        const rKey = iss.resolvedAt.toISOString().slice(0, 10);
        if (dayBuckets[rKey]) dayBuckets[rKey].resolved += 1;
      }
    });

    res.json({ weekly: Object.values(dayBuckets) });
  } catch (err) {
    next(err);
  }
}

export async function leaderboard(req, res, next) {
  try {
    const citizens = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        name: true,
        ward: true,
        createdAt: true,
        issues: {
          select: {
            id: true,
            status: true,
            upvotes: true,
          },
        },
        votes: {
          select: { id: true },
        },
      },
    });

    const ranked = citizens.map((c) => {
      const reportsCount = c.issues.length;
      const resolvedCount = c.issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
      const upvotesReceived = c.issues.reduce((acc, i) => acc + (i.upvotes || 0), 0);
      const votesCast = c.votes.length;

      // Points calculation
      const points = (reportsCount * 10) + (resolvedCount * 25) + (upvotesReceived * 3) + (votesCast * 1);

      // Badges
      const badges = [];
      if (reportsCount >= 1) badges.push({ id: "pioneer", name: "Civic Pioneer", icon: "🌱", desc: "Reported first civic issue" });
      if (reportsCount >= 3) badges.push({ id: "active", name: "Active Citizen", icon: "⭐", desc: "Reported 3+ issues" });
      if (reportsCount >= 5) badges.push({ id: "guardian", name: "Ward Guardian", icon: "🛡️", desc: "Reported 5+ issues in ward" });
      if (reportsCount >= 10) badges.push({ id: "champion", name: "Civic Champion", icon: "🏆", desc: "Reported 10+ civic issues" });
      if (resolvedCount >= 2) badges.push({ id: "impact", name: "Impact Maker", icon: "✨", desc: "2+ issues reached full resolution" });
      if (upvotesReceived >= 15) badges.push({ id: "popular", name: "Community Voice", icon: "📢", desc: "Received 15+ community upvotes" });

      return {
        id: c.id,
        name: c.name,
        ward: c.ward || "City-wide",
        joinedDate: c.createdAt,
        reportsCount,
        resolvedCount,
        upvotesReceived,
        votesCast,
        points,
        badges,
      };
    });

    ranked.sort((a, b) => b.points - a.points);

    // Current user's stats
    const currentUserStats = req.user
      ? ranked.find((r) => r.id === req.user.id) || {
          id: req.user.id,
          name: req.user.name,
          ward: req.user.ward || "City-wide",
          reportsCount: 0,
          resolvedCount: 0,
          upvotesReceived: 0,
          votesCast: 0,
          points: 0,
          badges: [],
        }
      : null;

    const userRank = currentUserStats ? ranked.findIndex((r) => r.id === req.user.id) + 1 : null;

    res.json({
      leaderboard: ranked.slice(0, 20),
      userStats: currentUserStats ? { ...currentUserStats, rank: userRank || "-" } : null,
      totalCitizens: ranked.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function activityLogs(req, res, next) {
  try {
    const logs = await prisma.issueStatusHistory.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: {
        changedBy: {
          select: { id: true, name: true, role: true, email: true },
        },
        issue: {
          select: { id: true, title: true, category: true, ward: true, status: true },
        },
      },
    });

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        issueId: l.issueId,
        issueTitle: l.issue?.title || `Issue #${l.issueId}`,
        category: l.issue?.category,
        ward: l.issue?.ward,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        actor: l.changedBy ? { id: l.changedBy.id, name: l.changedBy.name, role: l.changedBy.role } : { name: "System", role: "SYSTEM" },
        note: l.note,
        timestamp: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
