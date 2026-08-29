"use client";

import { CollectionSelect } from "@/components/collection/CollectionSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ApiError, createCollection, updateCollection } from "@/lib/api";
import type { Collection } from "@/types";
import { useEffect, useState } from "react";

export function CollectionModal({
  open,
  onClose,
  collections,
  editingCollection,
  defaultParentId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  editingCollection?: Collection | null;
  defaultParentId?: string | null;
  onSaved: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(editingCollection);

  useEffect(() => {
    if (open) {
      setName(editingCollection?.name ?? "");
      setParentId(editingCollection?.parentId ?? defaultParentId ?? "");
    }
  }, [open, editingCollection, defaultParentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      if (isEditing && editingCollection) {
        await updateCollection(editingCollection._id, { name: trimmed, parentId: parentId || null });
        showSuccess(`Renamed to "${trimmed}"`);
      } else {
        await createCollection({ name: trimmed, parentId: parentId || null });
        showSuccess(`Created "${trimmed}"`);
      }
      onSaved();
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save the collection right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Rename Collection" : "New Collection"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Name
          </label>
          <Input
            autoFocus
            placeholder="Marvel"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
            Parent
          </label>
          <CollectionSelect
            collections={collections}
            value={parentId}
            onChange={setParentId}
            allowNone="None (top level)"
            excludeId={editingCollection?._id}
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
