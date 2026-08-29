"use client";

import type { MovieView } from "@/hooks/useMovieView";
import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

export function ViewToggle({ view, onChange }: { view: MovieView; onChange: (view: MovieView) => void }) {
  return (
    <div className="glass inline-flex shrink-0 gap-1 rounded-full p-1">
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200",
          view === "grid"
            ? "bg-[color:var(--accent)] text-[#1c1408]"
            : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200",
          view === "list"
            ? "bg-[color:var(--accent)] text-[#1c1408]"
            : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
        )}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
