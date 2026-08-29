"use client";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percent } from "@/lib/utils";
import type { Collection } from "@/types";
import { FolderClosed } from "lucide-react";
import Link from "next/link";

export function CollectionCard({
  collection,
  onRename,
  onDelete,
}: {
  collection: Collection;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { movieCount, watchedCount, childCollectionCount } = collection.stats;
  const remaining = movieCount - watchedCount;
  const pct = percent(watchedCount, movieCount);

  return (
    <Link
      href={`/collections/${collection._id}`}
      className="glass group animate-rise-in relative flex flex-col gap-4 rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--border-glass-strong)] hover:shadow-lg sm:p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="glass flex h-10 w-10 items-center justify-center rounded-2xl text-[color:var(--accent)]">
          <FolderClosed className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
        <div className="opacity-100 transition-opacity sm:opacity-40 sm:group-hover:opacity-100">
          <DropdownMenu
            items={[
              { label: "Rename", onSelect: onRename },
              { label: "Delete", onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg text-[color:var(--text-primary)]">
          {collection.name}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          {movieCount} movie{movieCount === 1 ? "" : "s"} · {watchedCount} watched
          {childCollectionCount > 0 && (
            <span>
              {" "}
              · {childCollectionCount} sub-collection{childCollectionCount === 1 ? "" : "s"}
            </span>
          )}
        </p>
      </div>

      <div>
        <ProgressBar value={pct} />
        <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--text-tertiary)]">
          <span className="tabular">{pct}% complete</span>
          <span className="tabular">{remaining} left</span>
        </div>
      </div>
    </Link>
  );
}
