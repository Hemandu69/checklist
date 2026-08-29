export interface SearchResult {
  type: "movie" | "collection";
  id: string;
  title: string;
  path: string[];
  watched?: boolean;
  collectionId?: string | null;
}
