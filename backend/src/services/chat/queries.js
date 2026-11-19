import prisma from "../../config/prisma.js";

/**
 * Build Prisma where clause based on extracted filters
 */
export function buildFilterWhere({ ward, category, priority, status, dateRange, userId, assignedToId }) {
  const where = {};

  if (ward) {
    if (Array.isArray(ward)) {
      where.ward = { in: ward };
    } else {
      where.ward = { contains: ward };
    }
  }

  if (category) {
    where.category = category;
  }

  if (priority) {
    where.priority = priority;
  }

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status };
    } else {
      where.status = status;
    }
  }

  if (dateRange && (dateRange.from || dateRange.to)) {
    where.createdAt = {};
    if (dateRange.from) where.createdAt.gte = dateRange.from;
    if (dateRange.to) where.createdAt.lte = dateRange.to;
  }

  if (userId) {
    where.userId = userId;
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  return where;
}

/**
 * Standard live status counts
 */
export async function getStatusCounts(filters = {}) {
  const where = buildFilterWhere(filters);
  const [total, pending, open, assigned, inProgress, resolved, rejected] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.count({ where: { ...where, status: "PENDING_APPROVAL" } }),
    prisma.issue.count({ where: { ...where, status: "OPEN" } }),
    prisma.issue.count({ where: { ...where, status: "ASSIGNED" } }),
    prisma.issue.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.issue.count({ where: { ...where, status: "RESOLVED" } }),
    prisma.issue.count({ where: { ...where, status: "REJECTED" } }),
  ]);

  return {
    total,
    pending,
    open,
    assigned,
    inProgress,
    resolved,
    rejected,
    active: open + assigned + inProgress,
  };
}

/**
 * Single issue details with full timeline history
 */
export async function getIssueWithHistory(issueId, user) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      user: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true, department: true } },
      approvedBy: { select: { id: true, name: true } },
      images: { select: { id: true, url: true } },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!issue) return null;

  // Privacy rules:
  // Guests cannot view single issue details
  if (!user) {
    return { restricted: true };
  }

  // Pending / Rejected issues can only be viewed by owner, admin, or assigned engineer
  if (["PENDING_APPROVAL", "REJECTED"].includes(issue.status)) {
    const isOwner = user.id === issue.userId;
    const isAdmin = user.role === "ADMIN";
    const isAssigned = user.id === issue.assignedToId;
    if (!isOwner && !isAdmin && !isAssigned) {
      return { restricted: true };
    }
  }

  return issue;
}

/**
 * Top wards by issue count
 */
export async function getTopWards(filters = {}, limit = 5) {
  const where = buildFilterWhere(filters);
  const grouped = await prisma.issue.groupBy({
    by: ["ward"],
    where: { ...where, ward: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { ward: "desc" } },
    take: limit,
  });

  return grouped.map((g) => ({ ward: g.ward, count: g._count._all }));
}

/**
 * Top categories by issue count
 */
export async function getTopCategories(filters = {}, limit = 5) {
  const where = buildFilterWhere(filters);
  const grouped = await prisma.issue.groupBy({
    by: ["category"],
    where,
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
    take: limit,
  });

  return grouped.map((g) => ({ category: g.category, count: g._count._all }));
}

/**
 * Resolution metrics (Rate, Avg time, Median time)
 */
export async function getResolutionMetrics(filters = {}) {
  const where = buildFilterWhere(filters);
  const [total, resolvedCount, resolvedRecords] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.count({ where: { ...where, status: "RESOLVED" } }),
    prisma.issue.findMany({
      where: { ...where, status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true, category: true },
    }),
  ]);

  if (!resolvedRecords.length) {
    return {
      total,
      resolvedCount,
      rate: total ? Math.round((resolvedCount / total) * 100) : 0,
      avgDays: 0,
      medianDays: 0,
      fastestCategory: null,
      slowestCategory: null,
    };
  }

  const durations = resolvedRecords.map((r) => (r.resolvedAt.getTime() - r.createdAt.getTime()) / 86400000);
  durations.sort((a, b) => a - b);

  const avgDays = durations.reduce((s, d) => s + d, 0) / durations.length;
  const medianDays = durations[Math.floor(durations.length / 2)];

  // Category speeds
  const catDurations = {};
  for (const r of resolvedRecords) {
    catDurations[r.category] ||= [];
    catDurations[r.category].push((r.resolvedAt.getTime() - r.createdAt.getTime()) / 86400000);
  }

  const catAvgs = Object.entries(catDurations).map(([cat, list]) => ({
    category: cat,
    avg: list.reduce((s, v) => s + v, 0) / list.length,
  }));
  catAvgs.sort((a, b) => a.avg - b.avg);

  return {
    total,
    resolvedCount,
    rate: total ? Math.round((resolvedCount / total) * 100) : 0,
    avgDays: Math.round(avgDays * 10) / 10,
    medianDays: Math.round(medianDays * 10) / 10,
    fastestCategory: catAvgs[0] ? { category: catAvgs[0].category, avgDays: Math.round(catAvgs[0].avg * 10) / 10 } : null,
    slowestCategory: catAvgs.length > 1 ? { category: catAvgs[catAvgs.length - 1].category, avgDays: Math.round(catAvgs[catAvgs.length - 1].avg * 10) / 10 } : null,
  };
}

/**
 * Oldest unresolved issue
 */
export async function getOldestUnresolved(filters = {}) {
  const where = buildFilterWhere(filters);
  const oldest = await prisma.issue.findFirst({
    where: {
      ...where,
      status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  if (!oldest) return null;

  const ageDays = Math.floor((Date.now() - oldest.createdAt.getTime()) / 86400000);
  return {
    id: oldest.id,
    title: oldest.title,
    category: oldest.category,
    priority: oldest.priority,
    status: oldest.status,
    ward: oldest.ward,
    location: oldest.location,
    createdAt: oldest.createdAt,
    ageDays,
    assignedEngineer: oldest.assignedTo?.name || null,
  };
}

/**
 * Backlog age distribution buckets
 */
export async function getBacklogBuckets(filters = {}) {
  const where = buildFilterWhere(filters);
  const activeIssues = await prisma.issue.findMany({
    where: {
      ...where,
      status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    },
    select: { createdAt: true },
  });

  const now = Date.now();
  const buckets = {
    under7Days: 0,
    days7to30: 0,
    days30to90: 0,
    over90Days: 0,
    total: activeIssues.length,
  };

  for (const i of activeIssues) {
    const days = (now - i.createdAt.getTime()) / 86400000;
    if (days < 7) buckets.under7Days++;
    else if (days <= 30) buckets.days7to30++;
    else if (days <= 90) buckets.days30to90++;
    else buckets.over90Days++;
  }

  return buckets;
}

/**
 * Repeat-problem hotspot locations
 */
export async function getRepeatProblemLocations(filters = {}) {
  const where = buildFilterWhere(filters);
  const issues = await prisma.issue.findMany({
    where,
    select: { location: true, ward: true, category: true },
  });

  const locMap = {};
  for (const i of issues) {
    const loc = i.location.split(",")[0].trim();
    if (loc.length > 3) {
      locMap[loc] ||= { location: loc, ward: i.ward, count: 0, categories: new Set() };
      locMap[loc].count++;
      locMap[loc].categories.add(i.category);
    }
  }

  const repeats = Object.values(locMap)
    .filter((l) => l.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((l) => ({
      location: l.location,
      ward: l.ward,
      count: l.count,
      categories: Array.from(l.categories),
    }));

  return repeats;
}

/**
 * Month-over-month trend comparison
 */
export async function getMonthlyTrendComparison() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [thisMonthCount, lastMonthCount, thisMonthResolved, lastMonthResolved] = await Promise.all([
    prisma.issue.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.issue.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
    prisma.issue.count({ where: { status: "RESOLVED", resolvedAt: { gte: thisMonthStart } } }),
    prisma.issue.count({ where: { status: "RESOLVED", resolvedAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
  ]);

  const momChange = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0;

  return {
    thisMonth: {
      name: thisMonthStart.toLocaleString("default", { month: "long" }),
      reported: thisMonthCount,
      resolved: thisMonthResolved,
    },
    lastMonth: {
      name: lastMonthStart.toLocaleString("default", { month: "long" }),
      reported: lastMonthCount,
      resolved: lastMonthResolved,
    },
    momChangePercent: momChange,
  };
}

/**
 * Compare two wards
 */
export async function compareWards(wardA, wardB) {
  const [statsA, statsB, topCatA, topCatB] = await Promise.all([
    getStatusCounts({ ward: wardA }),
    getStatusCounts({ ward: wardB }),
    getTopCategories({ ward: wardA }, 1),
    getTopCategories({ ward: wardB }, 1),
  ]);

  return {
    wardA: {
      name: wardA,
      ...statsA,
      topCategory: topCatA[0]?.category || "None",
    },
    wardB: {
      name: wardB,
      ...statsB,
      topCategory: topCatB[0]?.category || "None",
    },
  };
}

/**
 * Engineer Workload (for Admin view)
 */
export async function getEngineerWorkloads() {
  const engineers = await prisma.user.findMany({
    where: { role: "ENGINEER" },
    select: {
      id: true,
      name: true,
      ward: true,
      department: true,
      assignedIssues: {
        select: { id: true, status: true, priority: true },
      },
    },
  });

  return engineers.map((e) => {
    const assigned = e.assignedIssues.filter((i) => i.status === "ASSIGNED").length;
    const inProgress = e.assignedIssues.filter((i) => i.status === "IN_PROGRESS").length;
    const resolved = e.assignedIssues.filter((i) => i.status === "RESOLVED").length;
    return {
      id: e.id,
      name: e.name,
      ward: e.ward,
      department: e.department,
      assigned,
      inProgress,
      resolved,
      activeTotal: assigned + inProgress,
    };
  });
}

/**
 * Department Overview & Pending Count
 */
export async function getDepartmentOverview() {
  const issues = await prisma.issue.findMany({
    select: { category: true, status: true },
  });

  const DEPT_MAP = {
    ROAD: "Public Works Department (PWD)",
    STREET_LIGHT: "Electrical & Lighting Division",
    WATER: "Water Supply & Sewerage Board (BWSSB)",
    SANITATION: "Sanitation & Waste Management",
    ELECTRICITY: "Electricity Board (BESCOM)",
    PARK: "Horticulture & Parks Division",
    GAS: "Gas & Utilities Department",
    OTHER: "General Administration",
  };

  const counts = {};
  for (const name of Object.values(DEPT_MAP)) {
    counts[name] = { name, total: 0, pending: 0, resolved: 0, inProgress: 0 };
  }

  for (const iss of issues) {
    const dept = DEPT_MAP[iss.category] || "General Administration";
    if (!counts[dept]) counts[dept] = { name: dept, total: 0, pending: 0, resolved: 0, inProgress: 0 };
    counts[dept].total += 1;
    if (iss.status === "RESOLVED" || iss.status === "CLOSED") {
      counts[dept].resolved += 1;
    } else if (iss.status === "IN_PROGRESS") {
      counts[dept].inProgress += 1;
    } else {
      counts[dept].pending += 1;
    }
  }

  return Object.values(counts).sort((a, b) => b.pending - a.pending);
}
