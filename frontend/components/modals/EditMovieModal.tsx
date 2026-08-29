"use client";

import { CollectionSelect } from "@/components/collection/CollectionSelect";
import { MediaTypeToggle } from "@/components/movie/MediaTypeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ApiError, updateMovie } from "@/lib/api";
import type { Collection, MediaType, Movie } from "@/types";
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
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [collectionId, setCollectionId] = useState("");
  const [year, setYear] = useState("");
  const [runtime, setRuntime] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [busy, setBusy] = useState(false);

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
        mediaType,
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

  if (!movie) return null;

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
