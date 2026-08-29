"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { label: "Library", href: "/" },
  { label: "All", href: "/browse?filter=all" },
  { label: "Remaining", href: "/browse?filter=remaining" },
  { label: "Watched", href: "/browse?filter=watched" },
];

export function SectionTabs() {
  return (
    <Suspense fallback={<div className="glass h-9 w-64 rounded-full" />}>
      <SectionTabsInner />
    </Suspense>
  );
}

function SectionTabsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    const hrefFilter = new URLSearchParams(href.split("?")[1]).get("filter");
    return pathname === "/browse" && filter === hrefFilter;
  }

  return (
    <nav className="glass inline-flex gap-1 rounded-full p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
            isActive(tab.href)
              ? "bg-[color:var(--accent)] text-[#1c1408]"
              : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
