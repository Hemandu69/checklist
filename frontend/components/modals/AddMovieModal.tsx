"use client";

import { CollectionSelect } from "@/components/collection/CollectionSelect";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { bulkAddMovies, createMovie } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { parseBulkTitles } from "@/lib/utils";
import type { Collection } from "@/types";
import { useState } from "react";

type Tab = "single" | "bulk";

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
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? "");
  const [title, setTitle] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveCollectionId = (defaultCollectionId ?? collectionId) || null;
  const bulkCount = parseBulkTitles(bulkText).length;

  function reset() {
    setTitle("");
    setBulkText("");
    setTab("single");
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
        await createMovie({ title: title.trim(), collectionId: effectiveCollectionId });
        showSuccess(`Added "${title.trim()}"`);
      } else {
        if (bulkCount === 0) {
          showError("Paste at least one movie title.");
          return;
        }
        const result = await bulkAddMovies(effectiveCollectionId, bulkText);
        const skippedNote = result.skipped.length > 0 ? `, skipped ${result.skipped.length} duplicate${result.skipped.length === 1 ? "" : "s"}` : "";
        showSuccess(`Added ${result.created.length} movie${result.created.length === 1 ? "" : "s"}${skippedNote}`);
      }
      onAdded();
      handleClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't add the movie right now.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = tab === "single" ? title.trim().length > 0 : bulkCount > 0;

  return (
    <Modal open={open} onClose={handleClose} title="Add Movies" maxWidth="max-w-lg">
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
            Single movie
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
          <Input
            autoFocus
            placeholder="Movie title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        ) : (
          <div>
            <Textarea
              autoFocus
              rows={8}
              placeholder={"Paste movie names…\nIron Man\nThe Incredible Hulk\nIron Man 2\nThor"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">
              One title per line. Numbered lists and blank lines are handled automatically.
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
                ? `Add ${bulkCount || ""} Movie${bulkCount === 1 ? "" : "s"}`
                : "Add Movie"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
