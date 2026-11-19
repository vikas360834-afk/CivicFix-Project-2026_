import prisma from "../config/prisma.js";
import { classifyIssue } from "../services/ai.service.js";

const issueInclude = {
  user: { select: { id: true, name: true, role: true, ward: true } },
  assignedTo: { select: { id: true, name: true, role: true, ward: true, department: true } },
  approvedBy: { select: { id: true, name: true, role: true } },
  _count: { select: { comments: true } },
  images: { select: { id: true, url: true }, orderBy: { createdAt: "asc" } },
  statusHistory: {
    orderBy: { createdAt: "asc" },
    include: { changedBy: { select: { id: true, name: true, role: true } } },
  },
};

/**
 * Filter construction for list endpoints:
 * - Public feed: ONLY returns OPEN, ASSIGNED, IN_PROGRESS.
 *   RESOLVED, REJECTED, and PENDING_APPROVAL NEVER appear in general feed or on map.
 * - scope=mine: user's own reports (all statuses).
 * - scope=pending: admin view of pending issues.
 * - scope=assigned: engineer's assigned issues.
 * - scope=archive: admin view of resolved/rejected/closed issues.
 */
function buildWhere(query, user) {
  const where = {};
  if (query.category) where.category = query.category;
  if (query.ward) where.ward = query.ward;
  if (query.priority) where.priority = query.priority;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { description: { contains: query.q } },
      { location: { contains: query.q } },
    ];
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const scope = query.scope;
  const isAdmin = user && user.role === "ADMIN";
  const isEngineer = user && user.role === "ENGINEER";

  if (scope === "mine") {
    where.userId = user ? user.id : -1;
    if (query.status) where.status = query.status;
  } else if (scope === "pending") {
    if (isAdmin) {
      where.status = "PENDING_APPROVAL";
    } else {
      where.status = "PENDING_APPROVAL";
      where.userId = user ? user.id : -1;
    }
  } else if (scope === "assigned") {
    if (isEngineer) {
      where.assignedToId = user.id;
      if (query.status) where.status = query.status;
    } else if (isAdmin) {
      if (query.engineerId) where.assignedToId = parseInt(query.engineerId, 10);
      else where.assignedToId = { not: null };
      if (query.status) where.status = query.status;
    } else {
      where.assignedToId = -1;
    }
  } else if (scope === "archive") {
    if (isAdmin) {
      where.status = { in: ["RESOLVED", "REJECTED", "CLOSED"] };
      if (query.status) where.status = query.status;
    } else {
      where.status = "RESOLVED";
      where.userId = user ? user.id : -1;
    }
  } else if (scope === "all" && isAdmin) {
    if (query.status) where.status = query.status;
  } else {
    // General Public Feed: ONLY active public issues!
    // Never show RESOLVED, REJECTED, or PENDING_APPROVAL in the general feed.
    if (query.status) {
      // If a status filter is passed, it must be an active public status
      if (["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(query.status)) {
        where.status = query.status;
      } else if (isAdmin) {
        where.status = query.status;
      } else {
        // Disallow filtering resolved or private statuses publicly
        where.status = { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] };
      }
    } else {
      where.status = { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] };
    }
  }

  return where;
}

const publicIssue = (i) => {
  if (!i) return null;
  const now = Date.now();
  const createdMs = new Date(i.createdAt).getTime();
  const daysOld = Math.floor((now - createdMs) / 86400000);

  let isOverdue = false;
  if (i.status === "PENDING_APPROVAL" && daysOld >= 3) {
    isOverdue = true;
  } else if ((i.status === "ASSIGNED" || i.status === "IN_PROGRESS") && daysOld >= 7) {
    isOverdue = true;
  }

  return {
    ...i,
    isOverdue,
    overdueDays: isOverdue ? (i.status === "PENDING_APPROVAL" ? daysOld - 2 : daysOld - 6) : 0,
    user: i.user && { id: i.user.id, name: i.user.name, role: i.user.role },
  };
};

export async function createIssue(req, res, next) {
  try {
    const { title, description, category, location, ward, landmark, latitude, longitude } = req.body;

    // AI auto-classification
    const ai = classifyIssue(title, description, { upvotes: 0, daysOpen: 0 });
    const finalCategory = category && category !== "OTHER" ? category : ai.category;

    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        category: finalCategory,
        location,
        ward: ward || null,
        landmark: landmark || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: "PENDING_APPROVAL",
        priority: ai.priority,
        aiCategory: ai.category,
        aiPriority: ai.priority,
        aiDepartment: ai.department,
        userId: req.user.id,
      },
      include: issueInclude,
    });

    // Initial status history row
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: null,
        toStatus: "PENDING_APPROVAL",
        changedById: req.user.id,
        note: "Issue submitted by citizen",
      },
    });

    const fullIssue = await prisma.issue.findUnique({
      where: { id: issue.id },
      include: issueInclude,
    });

    res.status(201).json({ issue: publicIssue(fullIssue || issue), ai });
  } catch (err) {
    next(err);
  }
}

export async function listIssues(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(500, parseInt(req.query.limit, 10) || 12);
    const where = buildWhere(req.query, req.user);

    const sortField = ["createdAt", "upvotes", "priority", "updatedAt"].includes(req.query.sort)
      ? req.query.sort
      : "createdAt";
    const orderDir = req.query.order === "asc" ? "asc" : "desc";
    const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        include: issueInclude,
        orderBy:
          sortField === "priority"
            ? [{ priority: "desc" }]
            : [{ [sortField]: orderDir }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const sorted = sortField === "priority"
      ? issues.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
      : issues;

    res.json({
      issues: sorted.map(publicIssue),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        ...issueInclude,
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // Pending or Rejected issues: visible only to reporter, admin, or assigned engineer
    if (["PENDING_APPROVAL", "REJECTED"].includes(issue.status)) {
      const isReporter = req.user && issue.userId === req.user.id;
      const isAdmin = req.user && req.user.role === "ADMIN";
      const isAssigned = req.user && issue.assignedToId === req.user.id;
      if (!isReporter && !isAdmin && !isAssigned) {
        return res.status(404).json({ error: "Issue not found" });
      }
    }

    res.json({ issue: publicIssue(issue) });
  } catch (err) {
    next(err);
  }
}

export async function approveIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // Enforce legal transition from PENDING_APPROVAL
    if (issue.status !== "PENDING_APPROVAL") {
      return res.status(409).json({ error: "Only pending issues can be approved" });
    }

    const { priority, engineerId, note } = req.body;
    let newStatus = "OPEN";
    let assignedToId = null;
    let assignedAt = null;

    if (engineerId) {
      const engineer = await prisma.user.findUnique({ where: { id: parseInt(engineerId, 10) } });
      if (!engineer || engineer.role !== "ENGINEER") {
        return res.status(400).json({ error: "Invalid engineer ID" });
      }
      newStatus = "ASSIGNED";
      assignedToId = engineer.id;
      assignedAt = new Date();
    }

    const updateData = {
      status: newStatus,
      approvedById: req.user.id,
      approvedAt: new Date(),
    };

    if (priority) {
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      if (validPriorities.includes(priority.toUpperCase())) {
        updateData.priority = priority.toUpperCase();
      }
    }

    if (assignedToId) {
      updateData.assignedToId = assignedToId;
      updateData.assignedAt = assignedAt;
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: issueInclude,
    });

    // Write IssueStatusHistory
    await prisma.issueStatusHistory.create({
      data: {
        issueId: id,
        fromStatus: "PENDING_APPROVAL",
        toStatus: newStatus,
        changedById: req.user.id,
        note: note || (newStatus === "ASSIGNED" ? "Approved and assigned to engineer" : "Approved by administrator"),
      },
    });

    const fullIssue = await prisma.issue.findUnique({
      where: { id },
      include: issueInclude,
    });

    res.json({ issue: publicIssue(fullIssue || updated) });
  } catch (err) {
    next(err);
  }
}

export async function rejectIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // Enforce legal transition
    if (issue.status !== "PENDING_APPROVAL") {
      return res.status(409).json({ error: "Only pending issues can be rejected" });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
      },
      include: issueInclude,
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: id,
        fromStatus: "PENDING_APPROVAL",
        toStatus: "REJECTED",
        changedById: req.user.id,
        note: reason.trim(),
      },
    });

    const fullIssue = await prisma.issue.findUnique({
      where: { id },
      include: issueInclude,
    });

    res.json({ issue: publicIssue(fullIssue || updated) });
  } catch (err) {
    next(err);
  }
}

export async function assignIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    if (issue.status !== "OPEN") {
      return res.status(409).json({ error: "Only open issues can be assigned" });
    }

    const { engineerId } = req.body;
    if (!engineerId) {
      return res.status(400).json({ error: "engineerId is required" });
    }

    const engineer = await prisma.user.findUnique({ where: { id: parseInt(engineerId, 10) } });
    if (!engineer || engineer.role !== "ENGINEER") {
      return res.status(400).json({ error: "Invalid engineer ID" });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        status: "ASSIGNED",
        assignedToId: engineer.id,
        assignedAt: new Date(),
      },
      include: issueInclude,
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: id,
        fromStatus: "OPEN",
        toStatus: "ASSIGNED",
        changedById: req.user.id,
        note: `Assigned to ${engineer.name}`,
      },
    });

    const fullIssue = await prisma.issue.findUnique({
      where: { id },
      include: issueInclude,
    });

    res.json({ issue: publicIssue(fullIssue || updated) });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, note, afterImageUrl } = req.body;

    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    // An engineer can only change issues assigned to them
    if (req.user.role === "ENGINEER" && existing.assignedToId !== req.user.id) {
      return res.status(403).json({ error: "You can only update issues assigned to you" });
    }

    // Role check: Only assigned engineer or ADMIN
    const isAssignedEngineer = req.user.role === "ENGINEER" && existing.assignedToId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    if (!isAssignedEngineer && !isAdmin) {
      return res.status(403).json({ error: "Permission denied for this action" });
    }

    // Enforce legal status transitions:
    // ASSIGNED -> IN_PROGRESS
    // IN_PROGRESS -> RESOLVED
    const isValidAssignedToInProgress = existing.status === "ASSIGNED" && status === "IN_PROGRESS";
    const isValidInProgressToResolved = existing.status === "IN_PROGRESS" && status === "RESOLVED";

    if (!isValidAssignedToInProgress && !isValidInProgressToResolved) {
      return res.status(409).json({
        error: `Illegal status transition from ${existing.status} to ${status}. Allowed: ASSIGNED -> IN_PROGRESS, IN_PROGRESS -> RESOLVED.`,
      });
    }

    // Marking RESOLVED requires resolution note
    if (isValidInProgressToResolved && (!note || !note.trim())) {
      return res.status(400).json({ error: "Resolution note is required when marking an issue resolved" });
    }

    const data = { status };
    if (status === "IN_PROGRESS") {
      data.startedAt = new Date();
    } else if (status === "RESOLVED") {
      data.resolvedAt = new Date();
      data.resolutionNote = note ? note.trim() : null;
    }

    const updated = await prisma.issue.update({
      where: { id },
      data,
      include: issueInclude,
    });

    // Write IssueStatusHistory
    await prisma.issueStatusHistory.create({
      data: {
        issueId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedById: req.user.id,
        note: note ? note.trim() : (status === "IN_PROGRESS" ? "Engineer started work on site" : "Resolved"),
      },
    });

    // If afterImageUrl provided, attach as an IssueImage
    if (afterImageUrl && afterImageUrl.trim()) {
      await prisma.issueImage.create({
        data: {
          issueId: id,
          url: afterImageUrl.trim(),
        },
      });
    }

    const fullIssue = await prisma.issue.findUnique({
      where: { id },
      include: issueInclude,
    });

    res.json({ issue: publicIssue(fullIssue || updated) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/issues/pending
 * Admin view of pending approvals with automated duplicate detection warning
 * (same category within ~100m in the last 14 days)
 */
export async function pendingIssues(req, res, next) {
  try {
    const pendingList = await prisma.issue.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: issueInclude,
      orderBy: { createdAt: "desc" },
    });

    // Recent approved/active issues within last 14 days for duplicate checking
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const recentIssues = await prisma.issue.findMany({
      where: {
        createdAt: { gte: fourteenDaysAgo },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { id: true, category: true, latitude: true, longitude: true, title: true, status: true },
    });

    // Check duplicate warnings (~100 meters = ~0.001 deg lat/lng)
    const augmented = pendingList.map((p) => {
      let duplicateWarning = null;
      if (p.latitude != null && p.longitude != null) {
        const dup = recentIssues.find((r) => {
          if (r.id === p.id || r.category !== p.category) return false;
          // Approximate distance in meters
          const dLat = (p.latitude - r.latitude) * 111000;
          const dLng = (p.longitude - r.longitude) * 111000 * Math.cos(p.latitude * (Math.PI / 180));
          const distance = Math.hypot(dLat, dLng);
          return distance <= 110;
        });

        if (dup) {
          duplicateWarning = {
            message: `Possible duplicate: Issue #${dup.id} (${dup.category}) was reported within ~100m`,
            duplicateIssueId: dup.id,
            duplicateTitle: dup.title,
            duplicateStatus: dup.status,
          };
        }
      }

      return {
        ...publicIssue(p),
        duplicateWarning,
      };
    });

    res.json({ issues: augmented, total: augmented.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/issues/assigned
 * Engineer view of work orders assigned to them
 */
export async function assignedIssues(req, res, next) {
  try {
    const issues = await prisma.issue.findMany({
      where: { assignedToId: req.user.id },
      include: issueInclude,
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    });
    res.json({ issues: issues.map(publicIssue), total: issues.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/issues/mine
 * Citizen view of all their submitted reports
 */
export async function myIssues(req, res, next) {
  try {
    const issues = await prisma.issue.findMany({
      where: { userId: req.user.id },
      include: issueInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ issues: issues.map(publicIssue), total: issues.length });
  } catch (err) {
    next(err);
  }
}

export async function getIssueHistory(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, userId: true, assignedToId: true, status: true },
    });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    if (["PENDING_APPROVAL", "REJECTED"].includes(issue.status)) {
      const isReporter = req.user && issue.userId === req.user.id;
      const isAdmin = req.user && req.user.role === "ADMIN";
      const isAssigned = req.user && issue.assignedToId === req.user.id;
      if (!isReporter && !isAdmin && !isAssigned) {
        return res.status(404).json({ error: "Issue not found" });
      }
    }

    const history = await prisma.issueStatusHistory.findMany({
      where: { issueId },
      orderBy: { createdAt: "asc" },
      include: { changedBy: { select: { id: true, name: true, role: true } } },
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

export async function updateIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    const isOwner = existing.userId === req.user.id;
    const isStaff = ["ENGINEER", "ADMIN"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "You cannot edit this issue" });
    }

    const { title, description, category, location, ward, landmark } = req.body;
    const ai = classifyIssue(title || existing.title, description || existing.description, {
      upvotes: existing.upvotes,
      daysOpen: Math.floor((Date.now() - existing.createdAt.getTime()) / 86400000),
    });

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        category: category || ai.category,
        location: location ?? existing.location,
        ward: ward ?? existing.ward,
        landmark: landmark ?? existing.landmark,
        aiCategory: ai.category,
        aiPriority: ai.priority,
        aiDepartment: ai.department,
      },
      include: issueInclude,
    });
    res.json({ issue: publicIssue(issue) });
  } catch (err) {
    next(err);
  }
}

export async function deleteIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Issue not found" });
    if (existing.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "You cannot delete this issue" });
    }
    await prisma.issue.delete({ where: { id } });
    res.json({ message: "Issue deleted", id });
  } catch (err) {
    next(err);
  }
}

export async function toggleUpvote(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    const vote = await prisma.vote.findUnique({
      where: { userId_issueId: { userId: req.user.id, issueId: id } },
    });

    if (vote) {
      await prisma.vote.delete({ where: { id: vote.id } });
      const updated = await prisma.issue.update({ where: { id }, data: { upvotes: Math.max(0, existing.upvotes - 1) } });
      return res.json({ upvoted: false, upvotes: updated.upvotes });
    }

    await prisma.vote.create({ data: { userId: req.user.id, issueId: id } });
    const updated = await prisma.issue.update({ where: { id }, data: { upvotes: existing.upvotes + 1 } });
    res.json({ upvoted: true, upvotes: updated.upvotes });
  } catch (err) {
    next(err);
  }
}

export async function verifyIssue(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    if (existing.status !== "RESOLVED") {
      return res.status(409).json({ error: "Only resolved issues can be verified" });
    }

    const isReporter = req.user.id === existing.userId;
    const isAdmin = req.user.role === "ADMIN";
    if (!isReporter && !isAdmin) {
      return res.status(403).json({ error: "Only the issue reporter or an administrator can verify this resolution" });
    }

    const { feedback } = req.body;
    const note = feedback ? `Verified: ${feedback.trim()}` : "Resolution verified by citizen";

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        status: "CLOSED",
      },
      include: issueInclude,
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: id,
        fromStatus: "RESOLVED",
        toStatus: "VERIFIED",
        changedById: req.user.id,
        note,
      },
    });

    res.json({ message: "Resolution verified successfully", issue: publicIssue(updated) });
  } catch (err) {
    next(err);
  }
}

export async function checkDuplicateIssue(req, res, next) {
  try {
    const { title, description, category, ward, latitude, longitude } = req.body;
    if (!title && !description) {
      return res.json({ isDuplicate: false, matches: [] });
    }

    const candidates = await prisma.issue.findMany({
      where: {
        status: { in: ["PENDING_APPROVAL", "OPEN", "ASSIGNED", "IN_PROGRESS"] },
        ...(category && category !== "OTHER" ? { category } : {}),
      },
      take: 25,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        location: true,
        ward: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        upvotes: true,
      },
    });

    const matches = [];
    const textWords = `${title || ""} ${description || ""}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

    for (const c of candidates) {
      let score = 0;
      const reasons = [];

      if (ward && c.ward && c.ward.toLowerCase() === ward.toLowerCase()) {
        score += 25;
        reasons.push("Same ward");
      }

      if (latitude && longitude && c.latitude && c.longitude) {
        const dLat = Math.abs(c.latitude - parseFloat(latitude));
        const dLng = Math.abs(c.longitude - parseFloat(longitude));
        if (dLat < 0.003 && dLng < 0.003) {
          score += 45;
          reasons.push("Within ~300m GPS radius");
        } else if (dLat < 0.008 && dLng < 0.008) {
          score += 20;
          reasons.push("Nearby neighborhood (~800m)");
        }
      }

      const cWords = `${c.title} ${c.location}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const overlap = textWords.filter((w) => cWords.includes(w));
      if (overlap.length > 0) {
        score += Math.min(40, overlap.length * 15);
        reasons.push(`Similar terms: ${overlap.slice(0, 3).join(", ")}`);
      }

      if (score >= 35) {
        matches.push({
          ...c,
          similarityScore: Math.min(99, score),
          matchReasons: reasons,
        });
      }
    }

    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      isDuplicate: matches.length > 0,
      highestScore: matches[0]?.similarityScore || 0,
      matches: matches.slice(0, 5),
      possibleDuplicates: matches.slice(0, 5),
      hasPotentialDuplicate: matches.length > 0,
      confidence: matches[0]?.similarityScore || 0,
    });
  } catch (err) {
    next(err);
  }
}