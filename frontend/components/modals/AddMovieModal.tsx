"use client";

import { CollectionSelect } from "@/components/collection/CollectionSelect";
import { MediaTypeToggle } from "@/components/movie/MediaTypeToggle";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { bulkAddMovies, createMovie } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { parseBulkTitles } from "@/lib/utils";
import type { Collection, MediaTypeSelection } from "@/types";
import { useState } from "react";

type Tab = "single" | "bulk";

const BULK_PLACEHOLDER =
  "Paste titles…\nIron Man\nThor\nDaredevil S1\nJessica Jones S1\nLoki\nI Am Groot S1";

export function AddMovieModal({
  open,
  onClose,
  collections,
  defaultCollectionId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  defaultCollectionId?: string;
  onAdded: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [tab, setTab] = useState<Tab>("single");
  // Only used by the Single tab — Bulk always auto-resolves every title
  // independently, since one pasted list routinely mixes movies and shows.
  const [mediaType, setMediaType] = useState<MediaTypeSelection>("auto");
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? "");
  const [title, setTitle] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveCollectionId = (defaultCollectionId ?? collectionId) || null;
  const bulkCount = parseBulkTitles(bulkText).length;
  const singleNoun = mediaType === "movie" ? "Movie" : mediaType === "tv" ? "Show" : "Item";

  function reset() {
    setTitle("");
    setBulkText("");
    setTab("single");
    setMediaType("auto");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    try {
      if (tab === "single") {
        if (!title.trim()) return;
        await createMovie({ title: title.trim(), mediaType, collectionId: effectiveCollectionId });
        showSuccess(`Added "${title.trim()}"`);
      } else {
        if (bulkCount === 0) {
          showError("Paste at least one title.");
          return;
        }
        const result = await bulkAddMovies(effectiveCollectionId, bulkText);
        const skippedNote =
          result.skipped.length > 0
            ? `, skipped ${result.skipped.length} duplicate${result.skipped.length === 1 ? "" : "s"}`
            : "";
        showSuccess(`Added ${result.created.length} item${result.created.length === 1 ? "" : "s"}${skippedNote}`);
      }
      onAdded();
      handleClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't add that right now.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = tab === "single" ? title.trim().length > 0 : bulkCount > 0;
  const modalTitle =
    tab === "bulk"
      ? "Add Movies & TV Shows"
      : mediaType === "movie"
        ? "Add Movies"
        : mediaType === "tv"
          ? "Add TV Shows"
          : "Add Movies & TV Shows";

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!defaultCollectionId && (
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
        )}

        <div className="glass flex rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab("single")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "single"
                ? "bg-[color:var(--accent)] text-[#1c1408]"
                : "text-[color:var(--text-secondary)]"
            }`}
          >
            Single item
          </button>
          <button
            type="button"
            onClick={() => setTab("bulk")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "bulk"
                ? "bg-[color:var(--accent)] text-[#1c1408]"
                : "text-[color:var(--text-secondary)]"
            }`}
          >
            Bulk paste
          </button>
        </div>

        {tab === "single" ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
                Type
              </label>
              <MediaTypeToggle value={mediaType} onChange={setMediaType} allowAuto />
              {mediaType === "auto" && (
                <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">
                  We&rsquo;ll figure out whether it&rsquo;s a movie or a TV show from TMDB.
                </p>
              )}
            </div>
            <Input
              autoFocus
              placeholder={`${singleNoun} title…`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </>
        ) : (
          <div>
            <Textarea autoFocus rows={8} placeholder={BULK_PLACEHOLDER} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
            <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">
              One title per line. Movies and TV shows can be mixed freely — each is identified
              automatically. Numbered lists and blank lines are handled automatically.
            </p>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !canSubmit}>
            {busy
              ? "Adding…"
              : tab === "bulk"
                ? `Add ${bulkCount || ""} Item${bulkCount === 1 ? "" : "s"}`
                : `Add ${singleNoun}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
