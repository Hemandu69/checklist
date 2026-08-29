"use client";

import { Breadcrumb } from "@/components/collection/Breadcrumb";
import { ChildCollectionRow } from "@/components/collection/ChildCollectionRow";
import { SortableMovieList } from "@/components/movie/SortableMovieList";
import { AddMovieModal } from "@/components/modals/AddMovieModal";
import { CollectionModal } from "@/components/modals/CollectionModal";
import { EditMovieModal } from "@/components/modals/EditMovieModal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { ViewToggle } from "@/components/movie/ViewToggle";
import { useCollectionDetail } from "@/hooks/useCollectionDetail";
import { useCollections } from "@/hooks/useCollections";
import { useMovieView } from "@/hooks/useMovieView";
import { ApiError, deleteCollection, deleteMovie, reorderMovies, updateMovie } from "@/lib/api";
import { getBreadcrumbTrail } from "@/lib/collectionTree";
import { percent } from "@/lib/utils";
import type { Collection, Movie } from "@/types";
import { Film, FolderPlus, Plus, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { mutate as globalMutate } from "swr";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { detail, isLoading, error, mutate } = useCollectionDetail(id);
  const { collections } = useCollections();
  const [view, setView] = useMovieView();
  const { showError, showSuccess } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [subCollectionOpen, setSubCollectionOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [deletingMovie, setDeletingMovie] = useState<Movie | null>(null);
  const [renamingCollection, setRenamingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [renamingSelf, setRenamingSelf] = useState(false);

  function refreshAll() {
    mutate();
    globalMutate("collections");
  }

  async function handleToggle(movie: Movie) {
    if (!detail) return;
    const delta = movie.watched ? -1 : 1;
    const optimisticMovies = detail.movies.map((m) =>
      m._id === movie._id ? { ...m, watched: !m.watched } : m
    );
    mutate(
      {
        ...detail,
        movies: optimisticMovies,
        collection: {
          ...detail.collection,
          stats: {
            ...detail.collection.stats,
            watchedCount: detail.collection.stats.watchedCount + delta,
          },
        },
      },
      false
    );
    try {
      await updateMovie(movie._id, { watched: !movie.watched });
      globalMutate("collections");
      mutate();
    } catch (err) {
      mutate(detail, false);
      showError(err instanceof ApiError ? err.message : "Couldn't update that movie.");
    }
  }

  async function handleReorder(orderedIds: string[]) {
    if (!detail) return;
    const byId = new Map(detail.movies.map((m) => [m._id, m]));
    const reordered = orderedIds.map((movieId) => byId.get(movieId)!).filter(Boolean);
    mutate({ ...detail, movies: reordered }, false);
    try {
      await reorderMovies(id, orderedIds);
    } catch (err) {
      mutate(detail, false);
      showError(err instanceof ApiError ? err.message : "Couldn't save the new order.");
    }
  }

  async function handleDeleteMovie(movie: Movie) {
    try {
      await deleteMovie(movie._id);
      showSuccess(`Removed "${movie.title}"`);
      refreshAll();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this movie.");
    }
  }

  async function handleDeleteCollection(collection: Collection) {
    const isEmpty = collection.stats.movieCount === 0 && collection.stats.childCollectionCount === 0;
    try {
      await deleteCollection(collection._id, !isEmpty);
      showSuccess(isEmpty ? `Deleted "${collection.name}"` : `Deleted "${collection.name}" and its contents`);
      refreshAll();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this collection.");
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Couldn't connect to the library."
        description="The server might be waking up or unreachable. Try again in a moment."
        action={
          <Button variant="glass" onClick={() => mutate()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const { collection, childCollections, movies } = detail;
  const trail = collections.length > 0 ? getBreadcrumbTrail(collections, id) : [];
  const pct = percent(collection.stats.watchedCount, collection.stats.movieCount);
  const isEmpty = childCollections.length === 0 && movies.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb trail={trail.map((c) => ({ id: c._id, name: c.name }))} />

      <div className="animate-rise-in flex flex-col gap-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl tracking-tight text-[color:var(--text-primary)] sm:text-4xl">
              {collection.name}
            </h1>
            <p className="tabular mt-1.5 text-sm text-[color:var(--text-secondary)]">
              {collection.stats.movieCount} movie{collection.stats.movieCount === 1 ? "" : "s"} ·{" "}
              {collection.stats.watchedCount} watched
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <ViewToggle view={view} onChange={setView} />
            <Button variant="glass" size="sm" onClick={() => setRenamingSelf(true)}>
              Rename
            </Button>
            <Button variant="glass" size="sm" onClick={() => setSubCollectionOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              Sub-collection
            </Button>
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {collection.stats.movieCount > 0 && (
          <div className="max-w-md">
            <ProgressBar value={pct} />
            <p className="tabular mt-2 text-xs text-[color:var(--text-tertiary)]">{pct}% watched</p>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Film}
          title="This shelf is empty."
          description="Add a movie or paste a list to start building it."
          action={
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              Add movies
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {childCollections.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Collections
              </h2>
              <div className="flex flex-col gap-2">
                {childCollections.map((child) => (
                  <ChildCollectionRow
                    key={child._id}
                    collection={child}
                    onRename={() => setRenamingCollection(child)}
                    onDelete={() => setDeletingCollection(child)}
                  />
                ))}
              </div>
            </section>
          )}

          {movies.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Movies
              </h2>
              <div className="glass rounded-3xl p-2 sm:p-3">
                <SortableMovieList
                  movies={movies}
                  view={view}
                  onToggle={(movieId) => {
                    const movie = movies.find((m) => m._id === movieId);
                    if (movie) handleToggle(movie);
                  }}
                  onEdit={(movie) => setEditingMovie(movie)}
                  onDelete={(movie) => setDeletingMovie(movie)}
                  onReorder={handleReorder}
                />
              </div>
            </section>
          )}
        </div>
      )}

      <AddMovieModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        collections={collections}
        defaultCollectionId={id}
        onAdded={refreshAll}
      />

      <CollectionModal
        open={subCollectionOpen}
        onClose={() => setSubCollectionOpen(false)}
        collections={collections}
        defaultParentId={id}
        onSaved={refreshAll}
      />

      <CollectionModal
        open={renamingSelf}
        onClose={() => setRenamingSelf(false)}
        collections={collections}
        editingCollection={collection}
        onSaved={refreshAll}
      />

      <CollectionModal
        open={Boolean(renamingCollection)}
        onClose={() => setRenamingCollection(null)}
        collections={collections}
        editingCollection={renamingCollection}
        onSaved={refreshAll}
      />

      <EditMovieModal
        open={Boolean(editingMovie)}
        onClose={() => setEditingMovie(null)}
        movie={editingMovie}
        collections={collections}
        onSaved={refreshAll}
      />

      <ConfirmDialog
        open={Boolean(deletingMovie)}
        onClose={() => setDeletingMovie(null)}
        onConfirm={() => {
          if (deletingMovie) return handleDeleteMovie(deletingMovie);
        }}
        title={`Remove "${deletingMovie?.title}"?`}
        description="This will permanently remove the movie from your library."
        confirmLabel="Remove"
      />

      <ConfirmDialog
        open={Boolean(deletingCollection)}
        onClose={() => setDeletingCollection(null)}
        onConfirm={() => {
          if (deletingCollection) return handleDeleteCollection(deletingCollection);
        }}
        title={`Delete "${deletingCollection?.name}"?`}
        description={
          deletingCollection
            ? deletingCollection.stats.movieCount > 0 || deletingCollection.stats.childCollectionCount > 0
              ? `This will permanently remove ${deletingCollection.stats.movieCount} movie${deletingCollection.stats.movieCount === 1 ? "" : "s"} and ${deletingCollection.stats.childCollectionCount} sub-collection${deletingCollection.stats.childCollectionCount === 1 ? "" : "s"} inside it.`
              : "This will permanently remove the collection."
            : ""
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
