"use client";

import { SectionTabs } from "@/components/layout/SectionTabs";
import { MovieCard } from "@/components/movie/MovieCard";
import { MovieListItem } from "@/components/movie/MovieListItem";
import { MOVIE_GRID_CLASSES } from "@/components/movie/SortableMovieList";
import { ViewToggle } from "@/components/movie/ViewToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useCollections } from "@/hooks/useCollections";
import { useMovies } from "@/hooks/useMovies";
import { useMovieView } from "@/hooks/useMovieView";
import { ApiError, updateMovie } from "@/lib/api";
import { getBreadcrumbTrail, getRootAncestor } from "@/lib/collectionTree";
import type { Movie } from "@/types";
import { CheckCheck, Clapperboard, ListChecks } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { mutate as globalMutate } from "swr";

type Filter = "all" | "remaining" | "watched";

function BrowseContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter: Filter = filterParam === "remaining" || filterParam === "watched" ? filterParam : "all";

  const watchedParam = filter === "watched" ? true : filter === "remaining" ? false : undefined;
  const { movies, isLoading: moviesLoading, mutate: mutateMovies } = useMovies({ watched: watchedParam });
  const { movies: allMovies } = useMovies();
  const { collections, isLoading: collectionsLoading } = useCollections();
  const { showError } = useToast();
  const [view, setView] = useMovieView();

  const isLoading = moviesLoading || collectionsLoading;
  const libraryIsEmpty = allMovies.length === 0;

  const NO_COLLECTION_KEY = "none";

  const groups = useMemo(() => {
    const byRoot = new Map<string, Movie[]>();
    for (const movie of movies) {
      const root = getRootAncestor(collections, movie.collectionId);
      const key = root?._id ?? NO_COLLECTION_KEY;
      const list = byRoot.get(key) ?? [];
      list.push(movie);
      byRoot.set(key, list);
    }

    return Array.from(byRoot.entries())
      .map(([key, groupMovies]) => ({
        root: key === NO_COLLECTION_KEY ? null : collections.find((c) => c._id === key)!,
        movies: groupMovies,
      }))
      .sort((a, b) => b.movies.length - a.movies.length);
  }, [movies, collections]);

  async function handleToggle(movie: Movie) {
    const optimistic = movies.map((m) => (m._id === movie._id ? { ...m, watched: !m.watched } : m));
    mutateMovies(optimistic, false);
    try {
      await updateMovie(movie._id, { watched: !movie.watched });
      globalMutate("collections");
      mutateMovies();
    } catch (err) {
      mutateMovies(movies, false);
      showError(err instanceof ApiError ? err.message : "Couldn't update that movie.");
    }
  }

  const meta = {
    all: { title: "All Movies", icon: Clapperboard, empty: "No movies yet.", description: "Add a movie or paste a list from your library to get started." },
    remaining: { title: "Remaining", icon: ListChecks, empty: "Nothing left to watch.", description: "Every movie in your library has been checked off." },
    watched: { title: "Watched", icon: CheckCheck, empty: "Nothing watched yet.", description: "Check off a movie and it will show up here." },
  }[filter];

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-rise-in flex flex-col gap-1.5">
        <h1 className="font-display text-3xl tracking-tight text-[color:var(--text-primary)] sm:text-4xl">
          {meta.title}
        </h1>
        {!isLoading && <p className="tabular text-sm text-[color:var(--text-secondary)]">{movies.length} movie{movies.length === 1 ? "" : "s"}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        libraryIsEmpty ? (
          <EmptyState
            icon={Clapperboard}
            title="This shelf is empty."
            description="Add a movie or paste a list to start building it."
          />
        ) : (
          <EmptyState icon={meta.icon} title={meta.empty} description={meta.description} />
        )
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map(({ root, movies: groupMovies }) => (
            <section key={root?._id ?? "none"} className="flex flex-col gap-2.5">
              {root ? (
                <Link
                  href={`/collections/${root._id}`}
                  className="group flex items-baseline gap-2 px-1 text-sm font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                >
                  <span className="text-[color:var(--text-primary)]">{root.name}</span>
                  <span className="tabular text-[color:var(--text-tertiary)]">— {groupMovies.length}</span>
                </Link>
              ) : (
                <div className="flex items-baseline gap-2 px-1 text-sm font-medium text-[color:var(--text-secondary)]">
                  <span className="text-[color:var(--text-primary)]">No collection</span>
                  <span className="tabular text-[color:var(--text-tertiary)]">— {groupMovies.length}</span>
                </div>
              )}
              <div className="glass rounded-3xl p-3">
                <div className={view === "grid" ? MOVIE_GRID_CLASSES : "flex flex-col gap-0.5"}>
                  {groupMovies.map((movie) => {
                    const trail = getBreadcrumbTrail(collections, movie.collectionId);
                    const subPath = trail.slice(1, -1).map((c) => c.name);
                    const pathLabel = subPath.length > 0 ? subPath.join(" / ") : undefined;
                    return view === "grid" ? (
                      <MovieCard
                        key={movie._id}
                        movie={movie}
                        onToggle={() => handleToggle(movie)}
                        pathLabel={pathLabel}
                      />
                    ) : (
                      <MovieListItem
                        key={movie._id}
                        movie={movie}
                        onToggle={() => handleToggle(movie)}
                        pathLabel={pathLabel}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseContent />
    </Suspense>
  );
}
