import { Types } from "mongoose";
import { Movie, IMovie, PosterStatus } from "../models/Movie";
import { AppError } from "../utils/AppError";
import { parseBulkTitles } from "../utils/parseBulkTitles";
import { findPoster, isPosterProviderConfigured } from "./posterService";
import { mapWithConcurrency } from "../utils/mapWithConcurrency";
import { getCollectionOrThrow } from "./collectionService";

const POSTER_FETCH_CONCURRENCY = 4;
// Caps the one-time startup backfill below so a large backlog of previously
// "skipped" movies can't burst hundreds of requests at TMDB at once.
const STALE_POSTER_BACKFILL_LIMIT = 50;

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

async function assertCollectionExists(collectionId: string | null): Promise<void> {
  if (collectionId) await getCollectionOrThrow(collectionId);
}

/**
 * Looks up a poster (and light metadata) in the background and writes it onto
 * the movie once found. Never awaited by callers — a slow or unavailable
 * poster provider must never delay or fail movie creation. findPoster()
 * itself never throws, but this is still guarded so a lookup can never leave
 * a movie stuck in "pending" forever.
 */
async function attachPoster(
  movieId: Types.ObjectId,
  title: string,
  knownYear?: number,
  knownRuntime?: number
): Promise<void> {
  try {
    const result = await findPoster(title, knownYear);
    await Movie.findByIdAndUpdate(movieId, {
      posterUrl: result.posterUrl,
      posterSource: result.posterSource,
      posterStatus: result.posterUrl ? "found" : "unavailable",
      tmdbId: result.tmdbId,
      overview: result.overview,
      ...(result.year && !knownYear ? { year: result.year } : {}),
      ...(result.runtime && !knownRuntime ? { runtime: result.runtime } : {}),
    });
  } catch (err) {
    console.error(`[poster] Failed to attach poster for "${title}": ${err instanceof Error ? err.message : "unknown error"}`);
    await Movie.findByIdAndUpdate(movieId, { posterStatus: "unavailable" }).catch(() => {});
  }
}

/**
 * One-time startup backfill for movies that were created while TMDB_API_KEY
 * was unset (posterStatus "skipped"). Runs once, capped, and only does
 * anything when a provider is now configured — movies already "found" or
 * "unavailable" are left alone, so this never re-fetches on every restart.
 */
export async function retryStalePosterLookups(): Promise<void> {
  if (!isPosterProviderConfigured()) return;

  const stale = await Movie.find({ posterStatus: "skipped" })
    .select("_id title year runtime")
    .limit(STALE_POSTER_BACKFILL_LIMIT)
    .lean();

  if (stale.length === 0) return;

  console.log(`[poster] backfilling ${stale.length} movie(s) skipped before TMDB was configured`);

  await Movie.updateMany(
    { _id: { $in: stale.map((m) => m._id) } },
    { posterStatus: "pending" }
  );

  await mapWithConcurrency(stale, POSTER_FETCH_CONCURRENCY, (movie) =>
    attachPoster(movie._id, movie.title, movie.year, movie.runtime)
  );
}

export interface CreateMovieInput {
  title: string;
  collectionId?: string | null;
  year?: number;
  runtime?: number;
  posterUrl?: string;
}

export async function createMovie(input: CreateMovieInput): Promise<IMovie> {
  const title = input.title?.trim();
  if (!title) throw new AppError("Movie title is required", 400);

  const collectionId = input.collectionId || null;
  await assertCollectionExists(collectionId);

  const existing = await Movie.findOne({
    collectionId,
    title: { $regex: `^${escapeRegExp(title)}$`, $options: "i" },
  });
  if (existing) {
    throw new AppError(
      collectionId ? `"${title}" is already in this collection` : `"${title}" is already in your library`,
      409
    );
  }

  const count = await Movie.countDocuments({ collectionId });
  const shouldFetchPoster = !input.posterUrl && isPosterProviderConfigured();

  const movie = await Movie.create({
    title,
    collectionId,
    order: count,
    year: input.year,
    runtime: input.runtime,
    posterUrl: input.posterUrl,
    posterStatus: input.posterUrl ? "found" : shouldFetchPoster ? "pending" : "skipped",
  });

  if (shouldFetchPoster) void attachPoster(movie._id, title, input.year, input.runtime);

  return movie;
}

export interface BulkAddResult {
  created: IMovie[];
  skipped: string[];
}

export async function bulkAddMovies(collectionId: string | null, rawText: string): Promise<BulkAddResult> {
  await assertCollectionExists(collectionId);

  const titles = parseBulkTitles(rawText ?? "");
  if (titles.length === 0) {
    throw new AppError("No movie titles found to add", 400);
  }

  const existingMovies = await Movie.find({ collectionId }).select("title").lean();
  const existingTitles = new Set(existingMovies.map((m) => normalizeTitle(m.title)));

  const seenInBatch = new Set<string>();
  const toCreate: string[] = [];
  const skipped: string[] = [];

  for (const title of titles) {
    const normalized = normalizeTitle(title);
    if (existingTitles.has(normalized) || seenInBatch.has(normalized)) {
      skipped.push(title);
      continue;
    }
    seenInBatch.add(normalized);
    toCreate.push(title);
  }

  const shouldFetchPosters = isPosterProviderConfigured();
  const posterStatus: PosterStatus = shouldFetchPosters ? "pending" : "skipped";
  let count = await Movie.countDocuments({ collectionId });
  const docs = toCreate.map((title) => ({
    title,
    collectionId: collectionId ? new Types.ObjectId(collectionId) : null,
    order: count++,
    posterStatus,
  }));

  const created = docs.length > 0 ? await Movie.insertMany(docs) : [];

  if (shouldFetchPosters && created.length > 0) {
    void mapWithConcurrency(created, POSTER_FETCH_CONCURRENCY, (movie) =>
      attachPoster(movie._id, movie.title)
    );
  }

  return { created, skipped };
}

export interface UpdateMovieInput {
  title?: string;
  collectionId?: string | null;
  watched?: boolean;
  year?: number | null;
  runtime?: number | null;
  posterUrl?: string | null;
  order?: number;
}

export async function updateMovie(id: string, input: UpdateMovieInput): Promise<IMovie> {
  const movie = await Movie.findById(id);
  if (!movie) throw new AppError("Movie not found", 404);

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new AppError("Movie title cannot be empty", 400);
    movie.title = title;
  }

  if (input.collectionId !== undefined) {
    const nextCollectionId = input.collectionId || null;
    const currentCollectionId = movie.collectionId ? String(movie.collectionId) : null;
    if (nextCollectionId !== currentCollectionId) {
      await assertCollectionExists(nextCollectionId);
      const count = await Movie.countDocuments({ collectionId: nextCollectionId });
      movie.collectionId = nextCollectionId ? new Types.ObjectId(nextCollectionId) : null;
      movie.order = count;
    }
  }

  if (input.watched !== undefined) movie.watched = input.watched;
  if (input.year !== undefined) movie.year = input.year ?? undefined;
  if (input.runtime !== undefined) movie.runtime = input.runtime ?? undefined;
  if (input.posterUrl !== undefined) {
    movie.posterUrl = input.posterUrl ?? undefined;
    movie.posterSource = null;
    movie.posterStatus = input.posterUrl ? "found" : "skipped";
  }
  if (input.order !== undefined) movie.order = input.order;

  await movie.save();
  return movie;
}

export async function deleteMovie(id: string): Promise<void> {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) throw new AppError("Movie not found", 404);
}

export async function reorderMovies(collectionId: string | null, orderedIds: string[]): Promise<void> {
  await assertCollectionExists(collectionId);

  const movies = await Movie.find({ collectionId }).select("_id").lean();
  const validIds = new Set(movies.map((m) => String(m._id)));

  if (orderedIds.length !== validIds.size || orderedIds.some((id) => !validIds.has(id))) {
    throw new AppError("Reorder list must contain exactly the movies in this collection", 400);
  }

  await Promise.all(
    orderedIds.map((id, index) => Movie.updateOne({ _id: id }, { $set: { order: index } }))
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
