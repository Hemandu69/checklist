"use client";

import { flattenTree } from "@/lib/collectionTree";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types";

export function CollectionSelect({
  collections,
  value,
  onChange,
  allowNone,
  excludeId,
  className,
}: {
  collections: Collection[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: string;
  excludeId?: string;
  className?: string;
}) {
  const nodes = flattenTree(collections).filter(
    (n) => !excludeId || (n.collection._id !== excludeId && !isDescendantOf(collections, n.collection._id, excludeId))
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "glass h-11 w-full rounded-xl px-4 text-sm text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--accent)]",
        className
      )}
    >
      {allowNone && <option value="">{allowNone}</option>}
      {nodes.map(({ collection, depth }) => (
        <option key={collection._id} value={collection._id}>
          {" ".repeat(depth)}
          {depth > 0 ? "- " : ""}
          {collection.name}
        </option>
      ))}
    </select>
  );
}

function isDescendantOf(collections: Collection[], candidateId: string, ancestorId: string): boolean {
  const byId = new Map(collections.map((c) => [c._id, c]));
  let current = byId.get(candidateId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}
