import { Request, Response } from "express";
import { Movie } from "../models/Movie";
import {
  buildBreadcrumbMap,
  computeStatsMap,
  createCollection,
  deleteCollection,
  getCollectionOrThrow,
  updateCollection,
} from "../services/collectionService";
import { withDefaultMediaType } from "../services/movieService";
import { asyncHandler } from "../utils/asyncHandler";

export const listCollections = asyncHandler(async (_req: Request, res: Response) => {
  const { collections, statsById } = await computeStatsMap();
  const result = collections.map((c) => ({ ...c, stats: statsById.get(String(c._id)) }));
  res.json(result);
});

export const getCollectionDetail = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const collection = await getCollectionOrThrow(id);

  const { collections, statsById } = await computeStatsMap();
  const pathMap = buildBreadcrumbMap(collections);

  const childCollections = collections
    .filter((c) => String(c.parentId ?? "") === id)
    .map((c) => ({ ...c, stats: statsById.get(String(c._id)) }));

  const movies = await Movie.find({ collectionId: id }).sort({ order: 1, createdAt: 1 }).lean();

  res.json({
    collection: { ...collection, stats: statsById.get(id) },
    breadcrumb: pathMap.get(id) ?? [collection.name],
    childCollections,
    movies: movies.map(withDefaultMediaType),
  });
});

export const createCollectionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { name, parentId } = req.body;
  const collection = await createCollection({ name, parentId: parentId || null });
  res.status(201).json(collection);
});

export const updateCollectionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, parentId, order } = req.body;
  const collection = await updateCollection(id, { name, parentId, order });
  res.json(collection);
});

export const deleteCollectionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const force = req.query.force === "true";
  await deleteCollection(id, force);
  res.status(204).send();
});
