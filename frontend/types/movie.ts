export type PosterStatus = "pending" | "found" | "unavailable" | "skipped";
export type MediaType = "movie" | "tv";
/** "auto" means "let TMDB decide" — the default for new items unless the user forces a type. */
export type MediaTypeSelection = MediaType | "auto";

export interface Movie {
  _id: string;
  title: string;
  mediaType: MediaType;
  collectionId: string | null;
  watched: boolean;
  order: number;
  year?: number;
  runtime?: number;
  posterUrl?: string | null;
  posterSource?: string | null;
  posterStatus: PosterStatus;
  tmdbId?: number | null;
  overview?: string | null;
  createdAt: string;
  updatedAt: string;
}
