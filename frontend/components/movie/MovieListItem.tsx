"use client";

import { cn, formatRuntime } from "@/lib/utils";
import type { Movie } from "@/types";
import { Check, GripVertical, Pencil, Trash2 } from "lucide-react";

export function MovieListItem({
  movie,
  onToggle,
  onEdit,
  onDelete,
  pathLabel,
  dragHandleProps,
  isDragging,
}: {
  movie: Movie;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  pathLabel?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}) {
  const runtime = formatRuntime(movie.runtime);
  const watched = movie.watched;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-200 sm:gap-3.5 sm:px-4",
        "hover:bg-[color:var(--surface-glass)]",
        isDragging && "glass-strong shadow-xl"
      )}
    >
      {dragHandleProps ? (
        <div
          {...dragHandleProps}
          aria-label="Drag to reorder"
          className="flex shrink-0 cursor-grab touch-none items-center justify-center text-[color:var(--text-tertiary)] opacity-70 transition hover:text-[color:var(--text-secondary)] active:cursor-grabbing sm:opacity-40 sm:group-hover:opacity-100"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      ) : null}

      <button
        role="checkbox"
        aria-checked={watched}
        aria-label={watched ? "Mark as unwatched" : "Mark as watched"}
        onClick={onToggle}
        className="flex shrink-0 items-center justify-center p-2.5 -m-2.5"
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 active:scale-90",
            watched
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
              : "border-[color:var(--border-glass-strong)] bg-transparent hover:border-[color:var(--accent)]"
          )}
        >
          {watched && <Check className="animate-check-pop h-3.5 w-3.5 text-[#1c1408]" strokeWidth={3} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p
          data-watched={watched}
          className={cn(
            "strike-text truncate text-[15px] leading-snug",
            watched ? "text-[color:var(--text-tertiary)]" : "text-[color:var(--text-primary)]"
          )}
        >
          {movie.title}
        </p>
        {(movie.year || runtime || pathLabel) && (
          <p className="mt-0.5 truncate text-xs text-[color:var(--text-tertiary)]">
            {pathLabel && <span>{pathLabel}</span>}
            {pathLabel && (movie.year || runtime) && <span className="mx-1.5">·</span>}
            {movie.year && <span>{movie.year}</span>}
            {movie.year && runtime && <span className="mx-1.5">·</span>}
            {runtime && <span>{runtime}</span>}
          </p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-40 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label="Edit movie"
              className="rounded-lg p-1.5 text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-glass-strong)] hover:text-[color:var(--text-primary)]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete movie"
              className="rounded-lg p-1.5 text-[color:var(--text-secondary)] transition hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
