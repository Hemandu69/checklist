import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { retryStalePosterLookups } from "./services/movieService";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not configured. Set it in the environment before starting the server."
    );
  }

  await connectDB(MONGODB_URI);

  const app = createApp();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] listening on port ${PORT}`);
  });

  // Fire-and-forget: never delays startup or readiness.
  retryStalePosterLookups().catch((err) =>
    console.error("[poster] startup backfill failed:", err instanceof Error ? err.message : err)
  );

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] received ${signal}, shutting down`);

    server.close(async (err) => {
      if (err) console.error("[server] error while closing HTTP server:", err.message);
      try {
        await mongoose.connection.close();
        console.log("[mongo] connection closed");
      } catch (closeErr) {
        console.error("[mongo] error closing connection:", (closeErr as Error).message);
      } finally {
        process.exit(err ? 1 : 0);
      }
    });

    // Force-exit if something keeps the process alive (e.g. a hung request).
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[server] failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
