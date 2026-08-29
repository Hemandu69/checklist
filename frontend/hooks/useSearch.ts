import { search } from "@/lib/api";
import useSWR from "swr";
import { useDebounce } from "./useDebounce";

export function useSearch(query: string) {
  const debounced = useDebounce(query.trim(), 200);
  const { data, isLoading } = useSWR(debounced ? ["search", debounced] : null, () =>
    search(debounced)
  );
  return { results: data ?? [], isLoading: isLoading && debounced.length > 0 };
}
