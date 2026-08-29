import { getMovies } from "@/lib/api";
import type { Movie } from "@/types";
import useSWR from "swr";

const POSTER_POLL_INTERVAL_MS = 2500;

export function useMovies(params?: { watched?: boolean; collectionId?: string | null }) {
  const key = ["movies", params?.watched, params?.collectionId] as const;
  const { data, error, isLoading, mutate } = useSWR(key, () => getMovies(params), {
    refreshInterval: (latest?: Movie[]) =>
      latest?.some((m) => m.posterStatus === "pending") ? POSTER_POLL_INTERVAL_MS : 0,
  });
  return { movies: data ?? [], error, isLoading, mutate };
}
