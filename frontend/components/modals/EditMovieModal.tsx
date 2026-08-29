"use client";

import { CollectionSelect } from "@/components/collection/CollectionSelect";
import { MediaTypeToggle } from "@/components/movie/MediaTypeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ApiError, refreshTmdb, updateMovie } from "@/lib/api";
import type { Collection, MediaTypeSelection, Movie } from "@/types";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function EditMovieModal({
  open,
  onClose,
  movie,
  collections,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  movie: Movie | null;
  collections: Collection[];
  onSaved: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaTypeSelection>("movie");
  const [collectionId, setCollectionId] = useState("");
  const [year, setYear] = useState("");
  const [runtime, setRuntime] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (open && movie) {
      setTitle(movie.title);
      setMediaType(movie.mediaType ?? "movie");
      setCollectionId(movie.collectionId ?? "");
      setYear(movie.year ? String(movie.year) : "");
      setRuntime(movie.runtime ? String(movie.runtime) : "");
      setPosterUrl(movie.posterUrl ?? "");
    }
  }, [open, movie]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movie || !title.trim()) return;

    setBusy(true);
    try {
      await updateMovie(movie._id, {
        title: title.trim(),
        mediaType: mediaType === "auto" ? "movie" : mediaType,
        collectionId: collectionId || null,
        year: year ? Number(year) : null,
        runtime: runtime ? Number(runtime) : null,
        posterUrl: posterUrl.trim() ? posterUrl.trim() : null,
      });
      showSuccess(mediaType === "tv" ? "TV show updated" : "Movie updated");
      onSaved();
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save changes right now.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    if (!movie) return;
    setRefreshing(true);
    try {
      await refreshTmdb(movie._id);
      showSuccess("Refreshing from TMDB…");
      onSaved();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't refresh from TMDB right now.");
    } finally {
      setRefreshing(false);
    }
  }

  if (!movie) return null;

  const canRefresh = movie.posterStatus === "unavailable" || movie.posterStatus === "skipped";

  return (
    <Modal open={open} onClose={onClose} title={mediaType === "tv" ? "Edit TV Show" : "Edit Movie"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Type
          </label>
          <MediaTypeToggle value={mediaType} onChange={setMediaType} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Title
          </label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Collection
          </label>
          <CollectionSelect
            collections={collections}
            value={collectionId}
            onChange={setCollectionId}
            allowNone="No collection"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
              Year
            </label>
            <Input
              type="number"
              placeholder="2008"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
              Runtime (min)
            </label>
            <Input
              type="number"
              placeholder="126"
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Poster URL
          </label>
          <Input
            placeholder="https://…"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
          />
          {canRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[color:var(--accent)] transition hover:opacity-80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh from TMDB"}
            </button>
          )}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
