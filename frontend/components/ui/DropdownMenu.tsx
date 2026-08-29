"use client";

import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface Position {
  top: number;
  right: number;
}

export function DropdownMenu({
  items,
  variant = "default",
}: {
  items: DropdownItem[];
  /** "overlay" is a white-ring glass chip meant to sit on top of arbitrary poster art. */
  variant?: "default" | "overlay";
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setPosition(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPosition(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-label="More actions"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition",
          variant === "overlay"
            ? "border border-white/40 bg-black/30 text-white backdrop-blur-md hover:border-white/70 hover:bg-black/45"
            : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-glass-strong)] hover:text-[color:var(--text-primary)]"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, right: position.right }}
            className="modal-surface animate-scale-in z-50 min-w-[9rem] overflow-hidden rounded-xl py-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPosition(null);
                  item.onSelect();
                }}
                className={`block w-full px-3.5 py-2 text-left text-sm transition hover:bg-[color:var(--surface-glass)] ${
                  item.danger ? "text-[color:var(--danger)]" : "text-[color:var(--text-primary)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
