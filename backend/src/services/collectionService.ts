import { Types } from "mongoose";
import { Collection, ICollection } from "../models/Collection";
import { Movie } from "../models/Movie";
import { AppError } from "../utils/AppError";

export interface CollectionStats {
  directMovieCount: number;
  directWatchedCount: number;
  movieCount: number;
  watchedCount: number;
  childCollectionCount: number;
}

export type CollectionWithStats = ICollection & { stats: CollectionStats };

/**
 * Loads every collection and movie once, then folds movie counts up the
 * parent chain so nested franchises (e.g. Marvel > MCU > Phase 1) report
 * totals across all descendants, not just their direct children.
 */
export async function computeStatsMap(): Promise<{
  collections: ICollection[];
  statsById: Map<string, CollectionStats>;
  childrenById: Map<string, ICollection[]>;
}> {
  const [collections, movieCounts] = await Promise.all([
    Collection.find().sort({ order: 1, createdAt: 1 }).lean<ICollection[]>(),
    Movie.aggregate<{ _id: Types.ObjectId; total: number; watched: number }>([
      {
        $group: {
          _id: "$collectionId",
          total: { $sum: 1 },
          watched: { $sum: { $cond: ["$watched", 1, 0] } },
        },
      },
    ]),
  ]);

  const statsById = new Map<string, CollectionStats>();
  const childrenById = new Map<string, ICollection[]>();

  for (const c of collections) {
    statsById.set(String(c._id), {
      directMovieCount: 0,
      directWatchedCount: 0,
      movieCount: 0,
      watchedCount: 0,
      childCollectionCount: 0,
    });
    const parentKey = c.parentId ? String(c.parentId) : "root";
    const siblings = childrenById.get(parentKey) ?? [];
    siblings.push(c);
    childrenById.set(parentKey, siblings);
  }

  for (const mc of movieCounts) {
    const stats = statsById.get(String(mc._id));
    if (stats) {
      stats.directMovieCount = mc.total;
      stats.directWatchedCount = mc.watched;
    }
  }

  for (const c of collections) {
    const parentKey = c.parentId ? String(c.parentId) : "root";
    const stats = statsById.get(parentKey);
    if (stats) stats.childCollectionCount += 1;
  }

  // Post-order sum: a collection's total = its direct movies + sum of all children totals.
  const memo = new Map<string, { movieCount: number; watchedCount: number }>();

  function sumFor(id: string): { movieCount: number; watchedCount: number } {
    const cached = memo.get(id);
    if (cached) return cached;

    const stats = statsById.get(id)!;
    let movieCount = stats.directMovieCount;
    let watchedCount = stats.directWatchedCount;

    for (const child of childrenById.get(id) ?? []) {
      const childSum = sumFor(String(child._id));
      movieCount += childSum.movieCount;
      watchedCount += childSum.watchedCount;
    }

    const result = { movieCount, watchedCount };
    memo.set(id, result);
    stats.movieCount = movieCount;
    stats.watchedCount = watchedCount;
    return result;
  }

  for (const c of collections) sumFor(String(c._id));

  return { collections, statsById, childrenById };
}

export async function listCollectionsWithStats(): Promise<CollectionWithStats[]> {
  const { collections, statsById } = await computeStatsMap();
  return collections.map((c) => ({ ...c, stats: statsById.get(String(c._id))! }));
}

/** Maps each collection id to its full ancestor path, root-first, e.g. ["Marvel", "MCU", "Phase 1"]. */
export function buildBreadcrumbMap(collections: ICollection[]): Map<string, string[]> {
  const byId = new Map(collections.map((c) => [String(c._id), c]));
  const cache = new Map<string, string[]>();

  function pathFor(id: string): string[] {
    const cached = cache.get(id);
    if (cached) return cached;
    const c = byId.get(id);
    if (!c) return [];
    const parentPath = c.parentId ? pathFor(String(c.parentId)) : [];
    const path = [...parentPath, c.name];
    cache.set(id, path);
    return path;
  }

  for (const c of collections) pathFor(String(c._id));
  return cache;
}

export async function getCollectionOrThrow(id: string): Promise<ICollection> {
  const collection = await Collection.findById(id).lean<ICollection>();
  if (!collection) throw new AppError("Collection not found", 404);
  return collection;
}

async function wouldCreateCycle(id: string, newParentId: string | null): Promise<boolean> {
  if (!newParentId) return false;
  if (newParentId === id) return true;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === id) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: Pick<ICollection, "parentId"> | null = await Collection.findById(currentId)
      .select("parentId")
      .lean();
    currentId = current?.parentId ? String(current.parentId) : null;
  }
  return false;
}

export async function createCollection(input: { name: string; parentId?: string | null }) {
  const name = input.name?.trim();
  if (!name) throw new AppError("Collection name is required", 400);

  if (input.parentId) {
    await getCollectionOrThrow(input.parentId);
  }

  const siblingCount = await Collection.countDocuments({ parentId: input.parentId || null });
  return Collection.create({
    name,
    parentId: input.parentId || null,
    order: siblingCount,
  });
}

export async function updateCollection(
  id: string,
  input: { name?: string; parentId?: string | null; order?: number }
) {
  const collection = await Collection.findById(id);
  if (!collection) throw new AppError("Collection not found", 404);

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new AppError("Collection name cannot be empty", 400);
    collection.name = name;
  }

  if (input.parentId !== undefined) {
    const newParentId = input.parentId || null;
    if (newParentId) {
      await getCollectionOrThrow(newParentId);
      if (await wouldCreateCycle(id, newParentId)) {
        throw new AppError("Cannot move a collection into itself or one of its own subcollections", 400);
      }
    }
    collection.parentId = newParentId ? new Types.ObjectId(newParentId) : null;
  }

  if (input.order !== undefined) collection.order = input.order;

  await collection.save();
  return collection;
}

export async function getCollectionDescendantCounts(id: string) {
  const { collections, statsById } = await computeStatsMap();
  const stats = statsById.get(id);
  if (!stats) throw new AppError("Collection not found", 404);

  const idsToDelete = new Set<string>([id]);
  let frontier = [id];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const c of collections) {
      const parentKey = c.parentId ? String(c.parentId) : null;
      if (parentKey && frontier.includes(parentKey)) {
        next.push(String(c._id));
        idsToDelete.add(String(c._id));
      }
    }
    frontier = next;
  }

  return { idsToDelete: Array.from(idsToDelete), stats };
}

export async function deleteCollection(id: string, force: boolean) {
  await getCollectionOrThrow(id);
  const { idsToDelete, stats } = await getCollectionDescendantCounts(id);

  if (!force && (stats.movieCount > 0 || stats.childCollectionCount > 0)) {
    throw new AppError("This collection isn't empty", 409, {
      movieCount: stats.movieCount,
      childCollectionCount: stats.childCollectionCount,
    });
  }

  const objectIds = idsToDelete.map((i) => new Types.ObjectId(i));
  await Movie.deleteMany({ collectionId: { $in: objectIds } });
  await Collection.deleteMany({ _id: { $in: objectIds } });
}
