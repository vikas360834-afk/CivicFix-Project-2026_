import prisma from "../config/prisma.js";

export async function listComments(req, res, next) {
  try {
    const comments = await prisma.comment.findMany({
      where: { issueId: parseInt(req.params.id, 10) },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const comment = await prisma.comment.create({
      data: {
        body: req.body.body,
        isOfficial: ["ENGINEER", "ADMIN"].includes(req.user.role),
        userId: req.user.id,
        issueId,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}