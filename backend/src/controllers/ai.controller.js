import prisma from "../config/prisma.js";
import {
  classifyIssue,
  suggestCategory,
  suggestPriority,
  suggestDepartment,
  chatReply,
} from "../services/ai.service.js";

/** Auto-classify a free-text description (used live on the report form). */
export async function classify(req, res, next) {
  try {
    const { title, description, upvotes = 0, daysOpen = 0 } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "description is required" });
    }
    const ai = classifyIssue(title || "", description, { upvotes, daysOpen });
    res.json(ai);
  } catch (err) {
    next(err);
  }
}

/** Chat endpoint — returns reply + structured card data grounded in live DB. */
export async function chat(req, res, next) {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const result = await chatReply(message, req.user, history);

    // attach public live numbers
    const [open, resolved, total] = await Promise.all([
      prisma.issue.count({ where: { status: "OPEN" } }),
      prisma.issue.count({ where: { status: "RESOLVED" } }),
      prisma.issue.count(),
    ]);

    res.json({ ...result, live: { open, resolved, total } });
  } catch (err) {
    next(err);
  }
}

export { suggestCategory, suggestPriority, suggestDepartment };