"use client";

import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percent } from "@/lib/utils";
import { Plus } from "lucide-react";

export function OverviewHeader({
  watched,
  total,
  onAdd,
}: {
  watched: number;
  total: number;
  onAdd: () => void;
}) {
  const remaining = total - watched;
  const pct = percent(watched, total);

  return (
    <div className="animate-rise-in flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[color:var(--text-primary)] sm:text-5xl">
            My Movies
          </h1>
          <p className="tabular mt-2 text-[15px] text-[color:var(--text-secondary)]">
            {total > 0 ? (
              <>
                {watched} watched · {remaining} remaining
              </>
            ) : (
              "Your library is waiting to be built."
            )}
          </p>
        </div>

        <Button variant="primary" size="md" onClick={onAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add movies
        </Button>
      </div>

      {total > 0 && (
        <div className="max-w-md">
          <ProgressBar value={pct} />
          <p className="tabular mt-2 text-xs text-[color:var(--text-tertiary)]">
            {pct}% complete
          </p>
        </div>
      )}
    </div>
  );
}
