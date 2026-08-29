import { Request, Response } from "express";
import { search } from "../services/searchService";
import { asyncHandler } from "../utils/asyncHandler";

export const searchHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const results = await search(q);
  res.json(results);
});
