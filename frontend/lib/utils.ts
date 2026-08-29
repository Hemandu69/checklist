import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function percent(watched: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((watched / total) * 100);
}

const LEADING_NUMBER_PATTERN = /^\s*\d+[.)\-:]?\s+/;
const LEADING_BULLET_PATTERN = /^\s*[-*•]\s+/;

/** Client-side mirror of the backend's bulk title parser, used for live "Add N" counts. */
export function parseBulkTitles(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_NUMBER_PATTERN, "").replace(LEADING_BULLET_PATTERN, ""))
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0);
}
