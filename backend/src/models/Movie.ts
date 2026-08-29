import { Schema, model, Types } from "mongoose";

export type PosterStatus = "pending" | "found" | "unavailable" | "skipped";
export type MediaType = "movie" | "tv";

export interface IMovie {
  _id: Types.ObjectId;
  title: string;
  mediaType: MediaType;
  collectionId: Types.ObjectId | null;
  watched: boolean;
  order: number;
  year?: number;
  runtime?: number;
  posterUrl?: string | null;
  posterSource?: string | null;
  posterStatus: PosterStatus;
  tmdbId?: number | null;
  overview?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // Existing documents predate this field and have no mediaType stored —
    // the schema default covers them on read (Mongoose applies path defaults
    // when hydrating a document, just not under .lean(); lean() call sites
    // fall back to "movie" explicitly, see withDefaultMediaType in movieService).
    mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
    collectionId: { type: Schema.Types.ObjectId, ref: "Collection", default: null },
    watched: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    year: { type: Number, min: 1878, max: 2200 },
    runtime: { type: Number, min: 0, max: 2000 },
    posterUrl: { type: String, trim: true, maxlength: 2000, default: null },
    posterSource: { type: String, trim: true, maxlength: 60, default: null },
    posterStatus: {
      type: String,
      enum: ["pending", "found", "unavailable", "skipped"],
      default: "skipped",
    },
    tmdbId: { type: Number, default: null },
    overview: { type: String, trim: true, maxlength: 2000, default: null },
  },
  { timestamps: true }
);

movieSchema.index({ collectionId: 1, order: 1 });
movieSchema.index({ title: "text" });

export const Movie = model<IMovie>("Movie", movieSchema);
