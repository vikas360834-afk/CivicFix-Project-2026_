import { app } from "./app.js";

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception thrown:", error);
});

const server = app.listen(PORT, () => {
  console.log(`✅ CivicFix API running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("❌ Server listen error:", err);
});
