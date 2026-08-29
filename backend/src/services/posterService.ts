const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const REQUEST_TIMEOUT_MS = 5000;

export interface PosterLookupResult {
  posterUrl: string | null;
  posterSource: string | null;
  year: number | null;
}

const EMPTY_RESULT: PosterLookupResult = { posterUrl: null, posterSource: null, year: null };

/**
 * Whether a poster provider is configured at all. When it isn't, poster lookups
 * are skipped entirely rather than attempted and failed — the app must work
 * perfectly with no provider configured.
 */
export function isPosterProviderConfigured(): boolean {
  return Boolean(TMDB_API_KEY);
}

interface TmdbSearchResult {
  poster_path: string | null;
  release_date?: string;
}

/**
 * Looks up a movie's poster (and release year, if not already known) via TMDB.
 * Isolated behind this module so the provider can be swapped later without
 * touching movie creation logic. Never throws — any failure resolves to nulls
 * so a poster lookup can never block or fail a movie's creation.
 */
export async function findPoster(title: string, year?: number): Promise<PosterLookupResult> {
  if (!TMDB_API_KEY || !title.trim()) return EMPTY_RESULT;

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: title,
    include_adult: "false",
  });
  if (year) params.set("year", String(year));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${TMDB_SEARCH_URL}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) return EMPTY_RESULT;

    const data = (await res.json()) as { results?: TmdbSearchResult[] };
    const match = data.results?.[0];
    if (!match) return EMPTY_RESULT;

    const matchYear = match.release_date ? Number(match.release_date.slice(0, 4)) : null;

    return {
      posterUrl: match.poster_path ? `${TMDB_IMAGE_BASE}${match.poster_path}` : null,
      posterSource: match.poster_path ? "tmdb" : null,
      year: Number.isFinite(matchYear) ? matchYear : null,
    };
  } catch {
    return EMPTY_RESULT;
  } finally {
    clearTimeout(timeout);
  }
}
