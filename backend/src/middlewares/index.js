import cors from "cors";
import express from "express";
import requestLogger from "./requestLogger.js";

export default function registerMiddlewares(app) {
  app.use(cors());
  app.use(express.json({ limit: "40kb" }));
  app.use(express.urlencoded({ limit: "40kb", extended: true }));
  app.use(requestLogger);
}
