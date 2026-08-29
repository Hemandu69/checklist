import { getCollections } from "@/lib/api";
import useSWR from "swr";

export function useCollections() {
  const { data, error, isLoading, mutate } = useSWR("collections", getCollections);
  return { collections: data ?? [], error, isLoading, mutate };
}
