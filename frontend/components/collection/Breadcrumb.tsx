"use client";

import { ChevronRight, LibraryBig } from "lucide-react";
import Link from "next/link";

export function Breadcrumb({
  trail,
}: {
  trail: { id: string; name: string }[];
}) {
  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto text-sm text-[color:var(--text-tertiary)]">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-1 transition hover:text-[color:var(--text-primary)]"
      >
        <LibraryBig className="h-3.5 w-3.5" />
        Library
      </Link>
      {trail.map((item, i) => (
        <span key={item.id} className="flex shrink-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {i === trail.length - 1 ? (
            <span className="text-[color:var(--text-secondary)]">{item.name}</span>
          ) : (
            <Link href={`/collections/${item.id}`} className="transition hover:text-[color:var(--text-primary)]">
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
