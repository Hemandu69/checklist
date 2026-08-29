import mongoose from "mongoose";

export async function connectDB(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    console.log("[mongo] connected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

export type MongoReadyState = "disconnected" | "connected" | "connecting" | "disconnecting" | "unknown";

const READY_STATES: Record<number, MongoReadyState> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Current connection state, for the readiness endpoint — never exposes the URI itself. */
export function getMongoState(): MongoReadyState {
  return READY_STATES[mongoose.connection.readyState] ?? "unknown";
}
