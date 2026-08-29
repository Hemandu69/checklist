"use client";

import { useSearch } from "@/hooks/useSearch";
import { Film, FolderClosed, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useSearch(query);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function goTo(result: (typeof results)[number]) {
    // Movies don't have their own page — send the user to their collection, or
    // to the library home if they don't have one.
    if (result.type === "collection") {
      router.push(`/collections/${result.id}`);
    } else {
      router.push(result.collectionId ? `/collections/${result.collectionId}` : "/");
    }
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-surface animate-scale-in relative w-full max-w-lg overflow-hidden rounded-3xl">
        <div className="flex items-center gap-3 border-b border-[color:var(--border-glass)] px-5 py-4">
          <Search className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies and collections…"
            className="w-full bg-transparent text-sm text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-tertiary)]"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="rounded-full p-1 text-[color:var(--text-tertiary)] transition hover:text-[color:var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[color:var(--text-tertiary)]">
              Start typing to find a movie or collection.
            </p>
          ) : isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-[color:var(--text-tertiary)]">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[color:var(--text-tertiary)]">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => goTo(r)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[color:var(--surface-glass)]"
                  >
                    {r.type === "collection" ? (
                      <FolderClosed className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                    ) : (
                      <Film className="h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${r.watched ? "text-[color:var(--text-tertiary)] line-through" : "text-[color:var(--text-primary)]"}`}
                      >
                        {r.title}
                      </p>
                      {r.path.length > 0 && (
                        <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                          {r.path.join(" / ")}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
