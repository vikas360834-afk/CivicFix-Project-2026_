import multer from "multer";

/** Central error handler + 404 */
export function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Image too large — max 5MB per file" });
    if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ error: "Too many images — max 5 per upload" });
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  if (err.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2002") return res.status(409).json({ error: "Duplicate value for a unique field" });
    if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  res.status(500).json({ error: err.message || "Internal server error" });
}