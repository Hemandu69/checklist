import type { MediaType } from "../models/Movie";

/** "auto" means "figure out the media type from TMDB" — see resolveAuto() below. */
export type MediaTypeOrAuto = MediaType | "auto";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const REQUEST_TIMEOUT_MS = 6000;
const RETRY_DELAY_MS = 400;

/** Below this raw score a search result isn't trusted enough to attach — see bestCandidate. */
const MIN_CONFIDENCE_SCORE = 35;
/**
 * Added to a TV candidate's score, before comparing it against the best movie
 * candidate, when the original title carried a season marker ("S1", "Season 2",
 * …). That marker is a strong real-world signal the user means the series —
 * strong enough to beat even an exact-title movie match (e.g. "Daredevil S1"
 * must win over the unrelated 2003 "Daredevil" movie, even though the TV
 * entry is actually titled "Marvel's Daredevil" and only scores a
 * near-match), which is why this is bigger than the near-match gap (30)
 * between an exact title match and a whole-word containment match.
 */
const SEASON_HINT_BONUS = 40;

export interface PosterLookupResult {
  mediaType: MediaType;
  posterUrl: string | null;
  posterSource: string | null;
  year: number | null;
  tmdbId: number | null;
  runtime: number | null;
  overview: string | null;
}

function emptyResult(mediaType: MediaTypeOrAuto): PosterLookupResult {
  return {
    mediaType: mediaType === "auto" ? "movie" : mediaType,
    posterUrl: null,
    posterSource: null,
    year: null,
    tmdbId: null,
    runtime: null,
    overview: null,
  };
}

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

const YEAR_SUFFIX_PATTERN = /\s*\((\d{4})\)\s*$/;
const SEASON_SUFFIX_PATTERN = /\s+(?:season\s*\d{1,2}|s\d{1,2})\s*$/i;

export interface SearchNormalization {
  /** Query to actually send to TMDB — never what's stored or displayed. */
  query: string;
  /** True when the original title carried "S1"/"Season 2"/etc — a TV signal. */
  seasonHint: boolean;
  /** Year parsed out of a trailing "(YYYY)" in the title, if any. */
  yearHint: number | null;
}

/**
 * Strips search-only noise (a trailing "(YYYY)" or season marker like "S1"/
 * "Season 2") from a checklist title before it's sent to TMDB, and surfaces
 * what was stripped as matching hints. The caller's stored title is never
 * touched — this only ever affects the outgoing search query.
 */
export function normalizeTitleForSearch(rawTitle: string): SearchNormalization {
  let query = rawTitle.trim();
  let yearHint: number | null = null;

  const yearMatch = query.match(YEAR_SUFFIX_PATTERN);
  if (yearMatch) {
    yearHint = Number(yearMatch[1]);
    query = query.slice(0, yearMatch.index).trim();
  }

  let seasonHint = false;
  const seasonMatch = query.match(SEASON_SUFFIX_PATTERN);
  if (seasonMatch) {
    seasonHint = true;
    query = query.slice(0, seasonMatch.index).trim();
  }

  return { query: query || rawTitle.trim(), seasonHint, yearHint };
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when `words` begins with every word of `prefix`, in order. */
function wordsStartWith(words: string[], prefix: string[]): boolean {
  if (prefix.length === 0 || prefix.length > words.length) return false;
  return prefix.every((w, i) => words[i] === w);
}

/**
 * Cheap title-similarity score (0-100) — exact match, then whole-word prefix
 * or suffix containment, then word overlap. The suffix check matters in
 * practice: TMDB stores a number of shows with a studio/franchise prefix the
 * user's shorthand title naturally omits (e.g. the user types "Daredevil",
 * TMDB's TV entry is "Marvel's Daredevil") — without crediting that as a
 * near-match, the real show loses to an unrelated but literally-prefixed
 * result on title score alone.
 */
function titleSimilarity(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (query === candidate) return 100;

  const queryWords = query.split(" ");
  const candidateWords = candidate.split(" ");
  const containment =
    wordsStartWith(candidateWords, queryWords) ||
    wordsStartWith(queryWords, candidateWords) ||
    wordsStartWith([...candidateWords].reverse(), [...queryWords].reverse()) ||
    wordsStartWith([...queryWords].reverse(), [...candidateWords].reverse());
  if (containment) return 70;

  const queryWordSet = new Set(queryWords);
  const candidateWordSet = new Set(candidateWords);
  const overlap = [...queryWordSet].filter((w) => candidateWordSet.has(w)).length;
  const union = new Set([...queryWordSet, ...candidateWordSet]).size;
  return union ? (overlap / union) * 60 : 0;
}

interface ScoredCandidate {
  result: NormalizedSearchResult;
  score: number;
}

/**
 * Picks the most likely intended result out of a set of search results,
 * rather than blindly trusting result order. Scores each candidate on title
 * similarity (dominant factor), release-year proximity (when a year is
 * known), and popularity (a light tiebreaker) — title accuracy always
 * outweighs how popular a same-named-but-wrong result is. Returns the raw
 * best score with no confidence filtering; callers decide what to do with a
 * weak score (single-type lookups reject it, the auto movie-vs-tv resolver
 * needs the raw number to compare two candidate pools against each other).
 */
function bestCandidate(results: NormalizedSearchResult[], title: string, year?: number): ScoredCandidate | null {
  if (results.length === 0) return null;

  const query = normalizeForMatch(title);
  let best: ScoredCandidate | null = null;

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

  return best;
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
 * Searches both TMDB endpoints and picks whichever type's best candidate
 * scores higher — never movie-first-then-tv, since the same title can
 * legitimately exist as both (e.g. a movie and its later TV adaptation).
 * A season marker in the original title ("S1", "Season 2") nudges the
 * comparison toward the TV candidate, since that's a strong real-world
 * signal even when the raw title-similarity scores are close.
 */
async function resolveAuto(
  query: string,
  year: number | undefined,
  seasonHint: boolean
): Promise<{ mediaType: MediaType; candidate: ScoredCandidate | null }> {
  const [movieResults, tvResults] = await Promise.all([
    tmdbSearch("movie", query, year),
    tmdbSearch("tv", query, year),
  ]);

  const bestMovie = bestCandidate(movieResults, query, year);
  const bestTv = bestCandidate(tvResults, query, year);

  const movieScore = bestMovie?.score ?? -Infinity;
  const tvScore = (bestTv?.score ?? -Infinity) + (seasonHint ? SEASON_HINT_BONUS : 0);

  if (bestMovie === null && bestTv === null) return { mediaType: "movie", candidate: null };
  // A strict ">" (not ">=") means an exact tie defaults to movie — the
  // system's baseline type — rather than TV. Without a season hint that's
  // the safer call: e.g. "The Avengers" ties an unrelated 1961 British TV
  // series of the same name on title score alone, and should stay the 2012
  // Marvel movie. With a season hint the bonus is large enough to win
  // outright rather than merely tie, so this only affects the hint-less case.
  return tvScore > movieScore ? { mediaType: "tv", candidate: bestTv } : { mediaType: "movie", candidate: bestMovie };
}

/**
 * Looks up a movie or TV show's poster and light metadata via TMDB. Isolated
 * behind this module so the provider can be swapped later without touching
 * movie creation logic. Never throws — any failure resolves to nulls so a
 * poster lookup can never block or fail an item's creation.
 *
 * mediaType "auto" searches both /search/movie and /search/tv and picks the
 * stronger match across both — used whenever the caller doesn't already know
 * (or want to force) the type, which is the normal path for bulk imports and
 * the default for single adds. A concrete "movie"/"tv" searches only that
 * endpoint, for when the type is already known/forced.
 */
export async function findPoster(
  title: string,
  year?: number,
  mediaType: MediaTypeOrAuto = "movie"
): Promise<PosterLookupResult> {
  if (!TMDB_API_KEY || !title.trim()) return emptyResult(mediaType);

  const { query, seasonHint, yearHint } = normalizeTitleForSearch(title);
  const effectiveYear = year ?? yearHint ?? undefined;

  let resolvedType: MediaType;
  let candidate: ScoredCandidate | null;

  if (mediaType === "auto") {
    const resolved = await resolveAuto(query, effectiveYear, seasonHint);
    resolvedType = resolved.mediaType;
    candidate = resolved.candidate;
  } else {
    resolvedType = mediaType;
    const results = await tmdbSearch(mediaType, query, effectiveYear);
    candidate = bestCandidate(results, query, effectiveYear);
  }

  if (!candidate || candidate.score < MIN_CONFIDENCE_SCORE) {
    console.error(`[poster] TMDB lookup found no confident match for "${title}" (searched as ${mediaType})`);
    return emptyResult(mediaType === "auto" ? resolvedType : mediaType);
  }

  const match = candidate.result;
  const matchYear = match.releaseDate ? Number(match.releaseDate.slice(0, 4)) : null;

  // Runtime/overview require a second call; a confident title+poster match is
  // still worth keeping even if this one fails or times out. TV episode
  // runtimes aren't tracked (no season/episode tracking), so only movies get one.
  const details =
    resolvedType === "tv"
      ? await tmdbFetch<TmdbDetails>(`/tv/${match.id}`, {})
      : await tmdbFetch<TmdbDetails>(`/movie/${match.id}`, {});
  const runtime = resolvedType === "movie" && typeof details?.runtime === "number" ? details.runtime : null;

  return {
    mediaType: resolvedType,
    posterUrl: match.poster_path ? `${TMDB_IMAGE_BASE}${match.poster_path}` : null,
    posterSource: match.poster_path ? "tmdb" : null,
    year: Number.isFinite(matchYear) ? matchYear : null,
    tmdbId: match.id,
    runtime,
    overview: details?.overview || null,
  };
}
