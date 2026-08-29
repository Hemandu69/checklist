export type PosterStatus = "pending" | "found" | "unavailable" | "skipped";

export interface Movie {
  _id: string;
  title: string;
  collectionId: string | null;
  watched: boolean;
  order: number;
  year?: number;
  runtime?: number;
  posterUrl?: string | null;
  posterSource?: string | null;
  posterStatus: PosterStatus;
  createdAt: string;
  updatedAt: string;
}
