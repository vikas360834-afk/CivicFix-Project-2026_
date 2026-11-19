import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import prisma from "../config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  },
}).array("images", 5);

/** multer wrapper that converts errors into normal next(err) with a 400 status */
export function uploadImagesMw(req, res, next) {
  uploader(req, res, (err) => {
    if (err) {
      const e = { status: 400, message: err.message, code: err.code };
      return next(e);
    }
    next();
  });
}

const cleanup = (files) => {
  if (Array.isArray(files)) files.forEach((f) => fs.unlink(f.path, () => {}));
};

/** POST /api/issues/:id/images — owner or staff attach photos (max 5, field name "images") */
export async function addImages(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      cleanup(req.files);
      return res.status(404).json({ error: "Issue not found" });
    }
    const canEdit =
      issue.userId === req.user.id ||
      issue.assignedToId === req.user.id ||
      ["ENGINEER", "ADMIN"].includes(req.user.role);
    if (!canEdit) {
      cleanup(req.files);
      return res.status(403).json({ error: "You cannot add photos to this issue" });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Select at least one image (JPG, PNG, WEBP, GIF, max 5MB each)" });
    }

    const rows = await prisma.$transaction(
      req.files.map((f) => prisma.issueImage.create({ data: { issueId, url: `/uploads/${f.filename}` } }))
    );
    res.status(201).json({ images: rows.map((r) => ({ id: r.id, url: r.url })) });
  } catch (err) {
    cleanup(req.files);
    next(err);
  }
}

/** DELETE /api/issues/:id/images/:imageId — owner or staff remove one photo */
export async function removeImage(req, res, next) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const image = await prisma.issueImage.findFirst({ where: { id: imageId, issueId } });
    if (!image) return res.status(404).json({ error: "Image not found" });

    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    const canEdit =
      issue?.userId === req.user.id ||
      issue?.assignedToId === req.user.id ||
      ["ENGINEER", "ADMIN"].includes(req.user.role);
    if (!canEdit) return res.status(403).json({ error: "You cannot remove this image" });

    fs.unlink(path.join(uploadsDir, path.basename(image.url)), () => {});
    await prisma.issueImage.delete({ where: { id: image.id } });
    res.json({ message: "Image removed", id: image.id });
  } catch (err) {
    next(err);
  }
}