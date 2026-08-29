export interface CollectionStats {
  directMovieCount: number;
  directWatchedCount: number;
  movieCount: number;
  watchedCount: number;
  childCollectionCount: number;
}

export interface Collection {
  _id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  stats: CollectionStats;
}

export interface CollectionDetail {
  collection: Collection;
  breadcrumb: string[];
  childCollections: Collection[];
  movies: import("./movie").Movie[];
}
