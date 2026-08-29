import type { MediaType } from "../models/Movie";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const REQUEST_TIMEOUT_MS = 6000;
const RETRY_DELAY_MS = 400;

/** Below this score a search result isn't trusted enough to attach — see selectBestMatch. */
const MIN_CONFIDENCE_SCORE = 35;

export interface PosterLookupResult {
  posterUrl: string | null;
  posterSource: string | null;
  year: number | null;
  tmdbId: number | null;
  runtime: number | null;
  overview: string | null;
}

const EMPTY_RESULT: PosterLookupResult = {
  posterUrl: null,
  posterSource: null,
  year: null,
  tmdbId: null,
  runtime: null,
  overview: null,
};

/**
 * Whether a poster provider is configured at all. When it isn't, poster lookups
 * are skipped entirely rather than attempted and failed — the app must work
 * perfectly with no provider configured.
 */
export function isPosterProviderConfigured(): boolean {
  return Boolean(TMDB_API_KEY);
}

// TMDB's movie and TV search/details endpoints use different field names for
// the same concepts (title vs name, release_date vs first_air_date, a single
// runtime vs an episode_run_time array). Raw results are normalized into this
// common shape right after fetching, so the matching/scoring logic below
// never needs to know which media type it's looking at.
interface NormalizedSearchResult {
  id: number;
  title: string;
  originalTitle: string;
  poster_path: string | null;
  releaseDate?: string;
  popularity?: number;
}

interface TmdbMovieSearchResult {
  id: number;
  title: string;
  original_title?: string;
  poster_path: string | null;
  release_date?: string;
  popularity?: number;
}

interface TmdbTvSearchResult {
  id: number;
  name: string;
  original_name?: string;
  poster_path: string | null;
  first_air_date?: string;
  popularity?: number;
}

interface TmdbSearchResponse<T> {
  results?: T[];
}

interface TmdbDetails {
  runtime?: number | null;
  episode_run_time?: number[] | null;
  overview?: string | null;
}

type TmdbFetchAttempt<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; retryable: boolean };

async function tmdbFetchOnce<T>(path: string, search: URLSearchParams): Promise<TmdbFetchAttempt<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${TMDB_API_BASE}${path}?${search.toString()}`, {
      signal: controller.signal,
    });

    if (res.status === 429) return { ok: false, reason: "rate limit", retryable: false };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, retryable: false };

    try {
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, reason: "malformed response", retryable: false };
    }
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    // A connection-level failure (reset, refused, DNS blip) is often transient
    // and worth one immediate retry; a timeout means TMDB is already slow, so
    // retrying would just double the wait.
    return { ok: false, reason: isTimeout ? "timeout" : "network error", retryable: !isTimeout };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches a TMDB endpoint, never throwing. Returns null on any failure
 * (timeout, network error, HTTP error, malformed JSON) after logging a safe
 * diagnostic — the query string (which carries the API key) is never logged.
 * A single retry is allowed for connection-level failures only, so a
 * permanently unavailable movie still fails fast rather than being retried
 * indefinitely.
 */
async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  if (!TMDB_API_KEY) return null;

  const search = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });

  let attempt = await tmdbFetchOnce<T>(path, search);
  if (!attempt.ok && attempt.retryable) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    attempt = await tmdbFetchOnce<T>(path, search);
  }

  if (!attempt.ok) {
    console.error(`[poster] TMDB request failed on ${path}: ${attempt.reason}`);
    return null;
  }

  return attempt.data;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap title-similarity score (0-100) — exact match, prefix containment, then word overlap. */
function titleSimilarity(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (query === candidate) return 100;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return 70;

  const queryWords = new Set(query.split(" "));
  const candidateWords = new Set(candidate.split(" "));
  const overlap = [...queryWords].filter((w) => candidateWords.has(w)).length;
  const union = new Set([...queryWords, ...candidateWords]).size;
  return union ? (overlap / union) * 60 : 0;
}

/**
 * Picks the most likely intended movie out of a set of search results, rather
 * than blindly trusting result order. Scores each candidate on title
 * similarity (dominant factor), release-year proximity (when a year is known),
 * and popularity (a light tiebreaker). Returns null when nothing clears the
 * confidence bar, which the caller treats as "no suitable match".
 */
function selectBestMatch(
  results: NormalizedSearchResult[],
  title: string,
  year?: number
): NormalizedSearchResult | null {
  if (results.length === 0) return null;

  const query = normalizeForMatch(title);
  let best: { result: NormalizedSearchResult; score: number } | null = null;

  for (const result of results) {
    const candidateTitle = normalizeForMatch(result.title || "");
    const candidateOriginal = normalizeForMatch(result.originalTitle || "");
    const titleScore = Math.max(
      titleSimilarity(query, candidateTitle),
      titleSimilarity(query, candidateOriginal)
    );

    let score = titleScore;

    const releaseYear = result.releaseDate ? Number(result.releaseDate.slice(0, 4)) : null;
    if (year && releaseYear) {
      if (releaseYear === year) score += 50;
      else if (Math.abs(releaseYear - year) <= 1) score += 15;
    }

    score += Math.min(result.popularity ?? 0, 40) / 10;

    if (!best || score > best.score) best = { result, score };
  }

  if (!best || best.score < MIN_CONFIDENCE_SCORE) return null;
  return best.result;
}

/** Runs a title search against the movie or TV endpoint and normalizes the results to a common shape. */
async function tmdbSearch(mediaType: MediaType, title: string, year?: number): Promise<NormalizedSearchResult[]> {
  const searchParams: Record<string, string> = { query: title, include_adult: "false" };

  if (mediaType === "tv") {
    if (year) searchParams.first_air_date_year = String(year);
    const data = await tmdbFetch<TmdbSearchResponse<TmdbTvSearchResult>>("/search/tv", searchParams);
    const results = data?.results ?? [];
    return results.map((r) => ({
      id: r.id,
      title: r.name || "",
      originalTitle: r.original_name || "",
      poster_path: r.poster_path,
      releaseDate: r.first_air_date,
      popularity: r.popularity,
    }));
  }

  if (year) searchParams.year = String(year);
  const data = await tmdbFetch<TmdbSearchResponse<TmdbMovieSearchResult>>("/search/movie", searchParams);
  const results = data?.results ?? [];
  return results.map((r) => ({
    id: r.id,
    title: r.title || "",
    originalTitle: r.original_title || "",
    poster_path: r.poster_path,
    releaseDate: r.release_date,
    popularity: r.popularity,
  }));
}

/**
 * Looks up a movie or TV show's poster and light metadata via TMDB. Isolated
 * behind this module so the provider can be swapped later without touching
 * movie creation logic. Never throws — any failure resolves to nulls so a
 * poster lookup can never block or fail an item's creation.
 */
export async function findPoster(
  title: string,
  year?: number,
  mediaType: MediaType = "movie"
): Promise<PosterLookupResult> {
  if (!TMDB_API_KEY || !title.trim()) return EMPTY_RESULT;

  const results = await tmdbSearch(mediaType, title, year);
  if (results.length === 0) {
    console.error(`[poster] TMDB lookup found no results for "${title}" (${mediaType})`);
    return EMPTY_RESULT;
  }

  const match = selectBestMatch(results, title, year);
  if (!match) {
    console.error(`[poster] TMDB lookup found no confident match for "${title}" (${mediaType})`);
    return EMPTY_RESULT;
  }

  const matchYear = match.releaseDate ? Number(match.releaseDate.slice(0, 4)) : null;

  // Runtime/overview require a second call; a confident title+poster match is
  // still worth keeping even if this one fails or times out.
  const detailsPath = mediaType === "tv" ? `/tv/${match.id}` : `/movie/${match.id}`;
  const details = await tmdbFetch<TmdbDetails>(detailsPath, {});
  const runtime =
    mediaType === "tv"
      ? Array.isArray(details?.episode_run_time) && details.episode_run_time.length > 0
        ? details.episode_run_time[0]
        : null
      : typeof details?.runtime === "number"
        ? details.runtime
        : null;

  return {
    posterUrl: match.poster_path ? `${TMDB_IMAGE_BASE}${match.poster_path}` : null,
    posterSource: match.poster_path ? "tmdb" : null,
    year: Number.isFinite(matchYear) ? matchYear : null,
    tmdbId: match.id,
    runtime,
    overview: details?.overview || null,
  };
}
