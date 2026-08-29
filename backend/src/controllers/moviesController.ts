import { Request, Response } from "express";
import { Movie } from "../models/Movie";
import { AppError } from "../utils/AppError";
import {
  bulkAddMovies,
  createMovie,
  deleteMovie,
  reorderMovies,
  updateMovie,
  withDefaultMediaType,
} from "../services/movieService";
import { asyncHandler } from "../utils/asyncHandler";

/** "none" is the wire representation of "no collection" — real ids never collide with it. */
function parseCollectionIdParam(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === "none" || value === "" || value === null) return null;
  return String(value);
}

export const listMovies = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.watched === "true") filter.watched = true;
  if (req.query.watched === "false") filter.watched = false;
  const collectionId = parseCollectionIdParam(req.query.collectionId);
  if (collectionId !== undefined) filter.collectionId = collectionId;

  const movies = await Movie.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  res.json(movies.map(withDefaultMediaType));
});

export const createMovieHandler = asyncHandler(async (req: Request, res: Response) => {
  const { title, mediaType, year, runtime, posterUrl } = req.body;
  const collectionId = parseCollectionIdParam(req.body.collectionId) ?? null;
  const movie = await createMovie({ title, mediaType, collectionId, year, runtime, posterUrl });
  res.status(201).json(movie);
});

export const bulkAddMoviesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { text, mediaType } = req.body;
  const collectionId = parseCollectionIdParam(req.body.collectionId) ?? null;
  const result = await bulkAddMovies(collectionId, text, mediaType);
  res.status(201).json(result);
});

export const updateMovieHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = { ...req.body };
  if ("collectionId" in input) input.collectionId = parseCollectionIdParam(input.collectionId);
  const movie = await updateMovie(id, input);
  res.json(movie);
});

export const deleteMovieHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteMovie(id);
  res.status(204).send();
});

export const reorderMoviesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    throw new AppError("orderedIds[] is required", 400);
  }
  const collectionId = parseCollectionIdParam(req.body.collectionId) ?? null;
  await reorderMovies(collectionId, orderedIds);
  res.status(204).send();
});
