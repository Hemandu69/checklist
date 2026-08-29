"use client";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percent } from "@/lib/utils";
import type { Collection } from "@/types";
import { ChevronRight, FolderClosed } from "lucide-react";
import Link from "next/link";

export function ChildCollectionRow({
  collection,
  onRename,
  onDelete,
}: {
  collection: Collection;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { movieCount, watchedCount } = collection.stats;
  const pct = percent(watchedCount, movieCount);

  return (
    <Link
      href={`/collections/${collection._id}`}
      className="glass group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:border-[color:var(--border-glass-strong)] sm:gap-4"
    >
      <div className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--accent)]">
        <FolderClosed className="h-4 w-4" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[color:var(--text-primary)]">
          {collection.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-[color:var(--text-tertiary)]">
          {movieCount} movie{movieCount === 1 ? "" : "s"} · {watchedCount} watched
        </p>
      </div>

      {movieCount > 0 && (
        <div className="hidden w-24 shrink-0 sm:block">
          <ProgressBar value={pct} size="sm" />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-40 sm:group-hover:opacity-100">
        <DropdownMenu
          items={[
            { label: "Rename", onSelect: onRename },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
    </Link>
  );
}
