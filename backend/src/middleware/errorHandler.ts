import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err && typeof err === "object" && "type" in err && (err as { type: unknown }).type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large" });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON in request body" });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: "Validation failed", details: err.message });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid id format" });
    return;
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
    res.status(409).json({ error: "That already exists" });
    return;
  }

  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Something went wrong on the server" });
}
