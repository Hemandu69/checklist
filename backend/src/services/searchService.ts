import { Collection } from "../models/Collection";
import { Movie } from "../models/Movie";
import { buildBreadcrumbMap } from "./collectionService";

export interface SearchResult {
  type: "movie" | "collection";
  id: string;
  title: string;
  path: string[];
  watched?: boolean;
  collectionId?: string | null;
}

const MAX_RESULTS_PER_TYPE = 15;

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const [allCollections, matchingMovies] = await Promise.all([
    Collection.find().lean(),
    Movie.find({ title: regex }).limit(MAX_RESULTS_PER_TYPE).lean(),
  ]);

  const pathMap = buildBreadcrumbMap(allCollections);

  const movieResults: SearchResult[] = matchingMovies.map((m) => ({
    type: "movie",
    id: String(m._id),
    title: m.title,
    watched: m.watched,
    collectionId: m.collectionId ? String(m.collectionId) : null,
    path: m.collectionId ? pathMap.get(String(m.collectionId)) ?? [] : [],
  }));

  const collectionResults: SearchResult[] = allCollections
    .filter((c) => regex.test(c.name))
    .slice(0, MAX_RESULTS_PER_TYPE)
    .map((c) => ({
      type: "collection",
      id: String(c._id),
      title: c.name,
      path: pathMap.get(String(c._id)) ?? [],
    }));

  return [...collectionResults, ...movieResults];
}
