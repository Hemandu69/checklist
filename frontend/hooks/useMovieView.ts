"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "movie-view";

export type MovieView = "grid" | "list";

/** Shared, localStorage-backed view preference — read by every page that renders a movie list. */
export function useMovieView(): [MovieView, (view: MovieView) => void] {
  const [view, setView] = useState<MovieView>("grid");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      // localStorage unavailable (private browsing, etc.) — fall back to the default.
    }
  }, []);

  function updateView(next: MovieView) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // best-effort persistence only
    }
  }

  return [view, updateView];
}
