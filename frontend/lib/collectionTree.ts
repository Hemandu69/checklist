import type { Collection } from "@/types";

export function getChildren(collections: Collection[], parentId: string | null): Collection[] {
  return collections
    .filter((c) => (c.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getRootAncestor(collections: Collection[], id: string | null): Collection | undefined {
  if (!id) return undefined;
  const byId = new Map(collections.map((c) => [c._id, c]));
  let current = byId.get(id);
  if (!current) return undefined;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export interface FlatNode {
  collection: Collection;
  depth: number;
}

/** Flattens the collection tree into depth-first order, preserving each level's `order`. */
export function flattenTree(collections: Collection[], parentId: string | null = null, depth = 0): FlatNode[] {
  const children = getChildren(collections, parentId);
  const result: FlatNode[] = [];
  for (const child of children) {
    result.push({ collection: child, depth });
    result.push(...flattenTree(collections, child._id, depth + 1));
  }
  return result;
}

export function getBreadcrumbTrail(collections: Collection[], id: string | null): Collection[] {
  if (!id) return [];
  const byId = new Map(collections.map((c) => [c._id, c]));
  const trail: Collection[] = [];
  let current = byId.get(id);
  while (current) {
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}
