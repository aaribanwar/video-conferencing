import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import registerMiddlewares from "./middlewares/index.js";
import connectDB from "./database/index.js";
import userRoutes from "./routes/users.routes.js";

import requestLogger from "./middlewares/requestLogger.js";
import errorHandler from "./middlewares/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function createApp() {
  const app = express();

  // ─────────────────────────────────────────────
  // Core middlewares (body parsers, cors, etc.)
  // ─────────────────────────────────────────────
  registerMiddlewares(app);

  // Optional but recommended: request logging
  app.use(requestLogger);

  // ─────────────────────────────────────────────
  // TEMPORARY: mediasoup test surface
  // Accessible at /test/test.html
  // ─────────────────────────────────────────────
  app.use(
    "/test",
    express.static(path.join(__dirname, "..", "publicTest"))
  );

  // ─────────────────────────────────────────────
  // API routes
  // ─────────────────────────────────────────────
  app.use("/api/v1/users", userRoutes);

  // ─────────────────────────────────────────────
  // Global HTTP error handler (LAST)
  // ─────────────────────────────────────────────
  app.use(errorHandler);

  // ─────────────────────────────────────────────
  // One-time DB connection
  // ─────────────────────────────────────────────
  connectDB();

  return app;
}
