"use client";

import { Logo } from "@/components/layout/Logo";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function NavBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
        <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 text-[color:var(--text-primary)]">
            <Logo size={26} />
            <span className="font-display text-[17px] tracking-tight">
              My Movies
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-glass-strong)] hover:text-[color:var(--text-primary)]"
            >
              <Search className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
