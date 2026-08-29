"use client";

import type { MediaType } from "@/types";

export function MediaTypeToggle({
  value,
  onChange,
}: {
  value: MediaType;
  onChange: (value: MediaType) => void;
}) {
  return (
    <div className="glass flex rounded-xl p-1">
      <button
        type="button"
        onClick={() => onChange("movie")}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
          value === "movie" ? "bg-[color:var(--accent)] text-[#1c1408]" : "text-[color:var(--text-secondary)]"
        }`}
      >
        Movie
      </button>
      <button
        type="button"
        onClick={() => onChange("tv")}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
          value === "tv" ? "bg-[color:var(--accent)] text-[#1c1408]" : "text-[color:var(--text-secondary)]"
        }`}
      >
        TV Show
      </button>
    </div>
  );
}
