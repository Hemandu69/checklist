import type { Collection, CollectionDetail, Movie, SearchResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Something went wrong";
    const details = body && typeof body === "object" && "details" in body ? (body as { details: unknown }).details : undefined;
    throw new ApiError(message, res.status, details);
  }

  return body as T;
}

// Collections
export const getCollections = () => request<Collection[]>("/collections");
export const getCollectionDetail = (id: string) => request<CollectionDetail>(`/collections/${id}`);
export const createCollection = (input: { name: string; parentId?: string | null }) =>
  request<Collection>("/collections", { method: "POST", body: JSON.stringify(input) });
export const updateCollection = (
  id: string,
  input: { name?: string; parentId?: string | null; order?: number }
) => request<Collection>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteCollection = (id: string, force = false) =>
  request<void>(`/collections/${id}${force ? "?force=true" : ""}`, { method: "DELETE" });

// Movies
// A `collectionId` of "none" (both request and response) means "no collection" —
// movies sitting bare at the top of the library, alongside collection folders.
export const getMovies = (params?: { watched?: boolean; collectionId?: string | null }) => {
  const search = new URLSearchParams();
  if (params?.watched !== undefined) search.set("watched", String(params.watched));
  if (params?.collectionId !== undefined) search.set("collectionId", params.collectionId ?? "none");
  const qs = search.toString();
  return request<Movie[]>(`/movies${qs ? `?${qs}` : ""}`);
};
export const createMovie = (input: {
  title: string;
  collectionId?: string | null;
  year?: number;
  runtime?: number;
  posterUrl?: string;
}) => request<Movie>("/movies", { method: "POST", body: JSON.stringify(input) });
export const bulkAddMovies = (collectionId: string | null, text: string) =>
  request<{ created: Movie[]; skipped: string[] }>("/movies/bulk", {
    method: "POST",
    body: JSON.stringify({ collectionId, text }),
  });
export const updateMovie = (
  id: string,
  input: Partial<{
    title: string;
    collectionId: string | null;
    watched: boolean;
    year: number | null;
    runtime: number | null;
    posterUrl: string | null;
    order: number;
  }>
) => request<Movie>(`/movies/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteMovie = (id: string) => request<void>(`/movies/${id}`, { method: "DELETE" });
export const reorderMovies = (collectionId: string | null, orderedIds: string[]) =>
  request<void>("/movies/reorder", { method: "PATCH", body: JSON.stringify({ collectionId, orderedIds }) });

// Search
export const search = (q: string) => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`);
