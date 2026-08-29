"use client";

import type { MediaTypeSelection } from "@/types";
import { cn } from "@/lib/utils";

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
        active ? "bg-[color:var(--accent)] text-[#1c1408]" : "text-[color:var(--text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Movie / TV Show selector. With `allowAuto`, a third "Auto" segment appears
 * first and becomes a valid value — used where automatic TMDB detection is
 * the normal path (adding new items). Without it, only the two concrete
 * types are selectable — used for editing an existing item, where the user
 * is making a deliberate correction, not asking for a fresh guess.
 */
export function MediaTypeToggle({
  value,
  onChange,
  allowAuto,
}: {
  value: MediaTypeSelection;
  onChange: (value: MediaTypeSelection) => void;
  allowAuto?: true;
}) {
  return (
    <div className="glass flex rounded-xl p-1">
      {allowAuto && (
        <Segment active={value === "auto"} onClick={() => onChange("auto")}>
          Auto
        </Segment>
      )}
      <Segment active={value === "movie"} onClick={() => onChange("movie")}>
        Movie
      </Segment>
      <Segment active={value === "tv"} onClick={() => onChange("tv")}>
        TV Show
      </Segment>
    </div>
  );
}
