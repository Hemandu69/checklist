import { getCollectionDetail } from "@/lib/api";
import type { CollectionDetail } from "@/types";
import useSWR from "swr";

const POSTER_POLL_INTERVAL_MS = 2500;

export function useCollectionDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["collection-detail", id] : null,
    () => getCollectionDetail(id as string),
    {
      refreshInterval: (latest?: CollectionDetail) =>
        latest?.movies.some((m) => m.posterStatus === "pending") ? POSTER_POLL_INTERVAL_MS : 0,
    }
  );
  return { detail: data, error, isLoading, mutate };
}
