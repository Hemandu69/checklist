"use client";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { cn, formatRuntime } from "@/lib/utils";
import type { Movie } from "@/types";
import { Check, GripVertical } from "lucide-react";
import { useState } from "react";

export function MovieCard({
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
  const [imageFailed, setImageFailed] = useState(false);
  const runtime = formatRuntime(movie.runtime);
  const hasPoster = Boolean(movie.posterUrl) && !imageFailed;
  const isPending = movie.posterStatus === "pending";
  const watched = movie.watched;

  return (
    <div
      {...dragHandleProps}
      className={cn(
        "group relative aspect-[2/3] overflow-hidden rounded-2xl border border-[color:var(--border-glass)] transition-all duration-300",
        dragHandleProps && "cursor-grab active:cursor-grabbing",
        "hover:-translate-y-1 hover:border-[color:var(--border-glass-strong)] hover:shadow-xl",
        isDragging && "z-10 scale-[1.03] shadow-2xl"
      )}
    >
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={movie.posterUrl!}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
            watched && "opacity-55 saturate-[0.5]"
          )}
        />
      ) : isPending ? (
        <div className="absolute inset-0 flex items-end bg-[color:var(--border-glass-strong)]">
          <div className="h-full w-full animate-pulse bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[color:var(--surface-glass-strong)] to-[color:var(--surface-glass)] px-3 text-center transition-opacity",
            watched && "opacity-60"
          )}
        >
          <p
            data-watched={watched}
            className={cn(
              "strike-text line-clamp-3 font-display text-sm uppercase tracking-wide text-[color:var(--text-secondary)]"
            )}
          >
            {movie.title}
          </p>
          {movie.year && <p className="tabular text-xs text-[color:var(--text-tertiary)]">{movie.year}</p>}
        </div>
      )}

      {hasPoster && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            {pathLabel && (
              <p className="mb-0.5 truncate text-[10px] uppercase tracking-wide text-white/50">{pathLabel}</p>
            )}
            <p
              data-watched={watched}
              className={cn(
                "strike-text line-clamp-2 font-display text-[13.5px] leading-tight text-white",
                watched && "text-white/60"
              )}
            >
              {movie.title}
            </p>
            {(movie.year || runtime) && (
              <p className="tabular mt-0.5 truncate text-[11px] text-white/55">
                {movie.year}
                {movie.year && runtime && " · "}
                {runtime}
              </p>
            )}
          </div>
        </>
      )}

      {dragHandleProps && (
        <div className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white/70 opacity-70 backdrop-blur-md transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="absolute right-2 top-2 z-10" onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu
            variant="overlay"
            items={[
              ...(onEdit ? [{ label: "Edit", onSelect: onEdit }] : []),
              ...(onDelete ? [{ label: "Delete", onSelect: onDelete, danger: true }] : []),
            ]}
          />
        </div>
      )}

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={watched ? "Mark as unwatched" : "Mark as watched"}
        className={cn(
          "absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 active:scale-90",
          watched
            ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
            : "border-white/45 bg-black/30 hover:border-white/80 hover:bg-black/45"
        )}
      >
        {watched && <Check className="animate-check-pop h-4 w-4 text-[#1c1408]" strokeWidth={3} />}
      </button>
    </div>
  );
}
