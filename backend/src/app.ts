import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import { getMongoState } from "./config/db";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";

const DEFAULT_DEV_ORIGIN = "http://localhost:3000";

export function createApp(): Express {
  const app = express();

  // Browsers send the Origin header with no trailing slash, and the `cors`
  // package does an exact string match — a stray trailing slash on this env
  // var (an easy typo on Render's dashboard) silently breaks CORS for every
  // request, so it's stripped here rather than trusted as-is.
  const allowedOrigin = (process.env.FRONTEND_URL || DEFAULT_DEV_ORIGIN).replace(/\/+$/, "");

  app.use(helmet());
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: "1mb" }));

  // Liveness: the process is up. Kept trivial on purpose — no DB check here.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: is the database actually reachable. Never reveals the connection string.
  app.get("/health/db", (_req, res) => {
    const state = getMongoState();
    res.status(state === "connected" ? 200 : 503).json({ status: state === "connected" ? "ok" : "unavailable", mongo: state });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
