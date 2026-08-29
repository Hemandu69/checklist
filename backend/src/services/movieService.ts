import { Types } from "mongoose";
import { Movie, IMovie, MediaType, PosterStatus } from "../models/Movie";
import { AppError } from "../utils/AppError";
import { parseBulkTitles } from "../utils/parseBulkTitles";
import { findPoster, isPosterProviderConfigured, MediaTypeOrAuto } from "./posterService";
import { mapWithConcurrency } from "../utils/mapWithConcurrency";
import { getCollectionOrThrow } from "./collectionService";

const POSTER_FETCH_CONCURRENCY = 4;
// Caps the one-time startup backfill below so a large backlog of previously
// "skipped" movies can't burst hundreds of requests at TMDB at once.
const STALE_POSTER_BACKFILL_LIMIT = 50;

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Coerces an arbitrary value to a concrete MediaType, defaulting to "movie" — used where a type must already be settled (edits, legacy reads). */
function normalizeMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie";
}

/**
 * Parses a mediaType the caller may or may not have supplied. Returns the
 * concrete type only when the caller explicitly forced one; null covers
 * "not supplied" and "auto" alike, both of which mean "let TMDB decide" —
 * the normal path for bulk imports and the default for single adds.
 */
function parseExplicitMediaType(value: unknown): MediaType | null {
  return value === "movie" || value === "tv" ? value : null;
}

/**
 * Backfills mediaType on documents read via .lean(), which skips Mongoose's
 * schema-default application — records created before this field existed
 * would otherwise come back with mediaType undefined instead of "movie".
 */
export function withDefaultMediaType<T extends { mediaType?: MediaType }>(doc: T): T & { mediaType: MediaType } {
  return { ...doc, mediaType: doc.mediaType ?? "movie" };
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
 *
 * When mediaType is "auto" (the normal case for bulk imports and single adds
 * that didn't force a type), the resolved mediaType TMDB settled on is written
 * back onto the document alongside the poster — this is what lets "Daredevil
 * S1" land as a TV show without the user ever picking one.
 */
async function attachPoster(
  movieId: Types.ObjectId,
  title: string,
  knownYear?: number,
  knownRuntime?: number,
  mediaType: MediaTypeOrAuto = "movie"
): Promise<void> {
  try {
    const result = await findPoster(title, knownYear, mediaType);
    await Movie.findByIdAndUpdate(movieId, {
      mediaType: result.mediaType,
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

  // "auto" rather than trusting the stored mediaType — these records were
  // never actually checked against TMDB (no key was configured yet), so any
  // mediaType they carry is just the old create-time default, not a real
  // resolution. This is the same backfill path that can also fix a movie/tv
  // misclassification, not just a missing poster.
  await mapWithConcurrency(stale, POSTER_FETCH_CONCURRENCY, (movie) =>
    attachPoster(movie._id, movie.title, movie.year, movie.runtime, "auto")
  );
}

export interface CreateMovieInput {
  title: string;
  mediaType?: string;
  collectionId?: string | null;
  year?: number;
  runtime?: number;
  posterUrl?: string;
}

export async function createMovie(input: CreateMovieInput): Promise<IMovie> {
  const title = input.title?.trim();
  if (!title) throw new AppError("Movie title is required", 400);

  // Explicitly forced ("movie"/"tv") wins outright. Omitted or "auto" means
  // TMDB decides in the background — the record is created with a "movie"
  // placeholder immediately (posterStatus "pending" hides the mislabel from
  // the UI in the interim) and attachPoster corrects it once resolved.
  const explicitMediaType = parseExplicitMediaType(input.mediaType);
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
    mediaType: explicitMediaType ?? "movie",
    collectionId,
    order: count,
    year: input.year,
    runtime: input.runtime,
    posterUrl: input.posterUrl,
    posterStatus: input.posterUrl ? "found" : shouldFetchPoster ? "pending" : "skipped",
  });

  if (shouldFetchPoster) {
    void attachPoster(movie._id, title, input.year, input.runtime, explicitMediaType ?? "auto");
  }

  return movie;
}

export interface BulkAddResult {
  created: IMovie[];
  skipped: string[];
}

export async function bulkAddMovies(
  collectionId: string | null,
  rawText: string,
  mediaTypeInput?: string
): Promise<BulkAddResult> {
  await assertCollectionExists(collectionId);
  // Normally omitted — each title in the pasted batch is independently
  // auto-resolved (a movie next to a "S1" TV show in the same paste is the
  // whole point). An explicit override here forces the entire batch to one
  // type, kept only for API flexibility, not exposed by the bulk-paste UI.
  const explicitMediaType = parseExplicitMediaType(mediaTypeInput);

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
    mediaType: explicitMediaType ?? "movie",
    collectionId: collectionId ? new Types.ObjectId(collectionId) : null,
    order: count++,
    posterStatus,
  }));

  const created = docs.length > 0 ? await Movie.insertMany(docs) : [];

  if (shouldFetchPosters && created.length > 0) {
    void mapWithConcurrency(created, POSTER_FETCH_CONCURRENCY, (movie) =>
      attachPoster(movie._id, movie.title, undefined, undefined, explicitMediaType ?? "auto")
    );
  }

  return { created, skipped };
}

export interface UpdateMovieInput {
  title?: string;
  mediaType?: string;
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

  // Changing the type on purpose means the current poster/metadata (fetched
  // for the old type) is very likely wrong for the new one — e.g. a TV show
  // re-typed as a movie would otherwise keep its series poster. Re-resolving
  // against the new explicit type replaces it in the background, the same
  // way a fresh create's poster fetch works.
  let mediaTypeChanged = false;
  if (input.mediaType !== undefined) {
    const nextMediaType = normalizeMediaType(input.mediaType);
    mediaTypeChanged = nextMediaType !== movie.mediaType;
    movie.mediaType = nextMediaType;
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

  // Only auto-refresh when the caller didn't also hand us an explicit poster
  // in the same edit — that's a deliberate override and should win outright.
  const shouldRefreshPoster = mediaTypeChanged && input.posterUrl === undefined && isPosterProviderConfigured();
  if (shouldRefreshPoster) movie.posterStatus = "pending";

  await movie.save();

  if (shouldRefreshPoster) {
    void attachPoster(movie._id, movie.title, undefined, undefined, movie.mediaType);
  }

  return movie;
}

/**
 * Manually re-runs TMDB resolution for one existing item — the "Refresh TMDB"
 * action for records that predate automatic detection and were incorrectly
 * typed (e.g. a TV show stuck as "movie" with no poster). Always resolves in
 * "auto" mode, so it can fix the mediaType as well as the poster, not just
 * retry the same (possibly wrong) type. Runs in the background exactly like
 * a fresh create's poster fetch — this never blocks on TMDB.
 */
export async function refreshMovieTmdb(id: string): Promise<IMovie> {
  const movie = await Movie.findById(id);
  if (!movie) throw new AppError("Movie not found", 404);
  if (!isPosterProviderConfigured()) throw new AppError("TMDB is not configured", 400);

  movie.posterStatus = "pending";
  await movie.save();

  // No knownYear/knownRuntime hint: unlike the routine backfill, this is a
  // deliberate repair, and locking in whatever year the previous (likely
  // wrong) resolution left behind would block this from correcting it.
  void attachPoster(movie._id, movie.title, undefined, undefined, "auto");

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
