"use client";

import { SectionTabs } from "@/components/layout/SectionTabs";
import { CollectionCard } from "@/components/home/CollectionCard";
import { OverviewHeader } from "@/components/home/OverviewHeader";
import { AddMovieModal } from "@/components/modals/AddMovieModal";
import { CollectionModal } from "@/components/modals/CollectionModal";
import { EditMovieModal } from "@/components/modals/EditMovieModal";
import { SortableMovieList } from "@/components/movie/SortableMovieList";
import { ViewToggle } from "@/components/movie/ViewToggle";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useCollections } from "@/hooks/useCollections";
import { useMovies } from "@/hooks/useMovies";
import { useMovieView } from "@/hooks/useMovieView";
import { getChildren } from "@/lib/collectionTree";
import { ApiError, deleteCollection, deleteMovie, reorderMovies, updateMovie } from "@/lib/api";
import type { Collection, Movie } from "@/types";
import { FolderPlus, LibraryBig } from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { collections, isLoading: collectionsLoading, mutate } = useCollections();
  const { movies: looseMovies, isLoading: looseLoading, mutate: mutateLoose } = useMovies({
    collectionId: null,
  });
  const { showError, showSuccess } = useToast();
  const [view, setView] = useMovieView();

  const isLoading = collectionsLoading || looseLoading;

  const [addOpen, setAddOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [deletingMovie, setDeletingMovie] = useState<Movie | null>(null);

  const roots = getChildren(collections, null);
  const totalMovies = roots.reduce((sum, c) => sum + c.stats.movieCount, 0) + looseMovies.length;
  const totalWatched =
    roots.reduce((sum, c) => sum + c.stats.watchedCount, 0) +
    looseMovies.filter((m) => m.watched).length;

  async function handleDelete(collection: Collection) {
    const isEmpty = collection.stats.movieCount === 0 && collection.stats.childCollectionCount === 0;
    try {
      await deleteCollection(collection._id, !isEmpty);
      showSuccess(isEmpty ? `Deleted "${collection.name}"` : `Deleted "${collection.name}" and its contents`);
      mutate();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this collection right now.");
    }
  }

  async function handleToggleLoose(movie: Movie) {
    const optimistic = looseMovies.map((m) => (m._id === movie._id ? { ...m, watched: !m.watched } : m));
    mutateLoose(optimistic, false);
    try {
      await updateMovie(movie._id, { watched: !movie.watched });
      mutateLoose();
    } catch (err) {
      mutateLoose(looseMovies, false);
      showError(err instanceof ApiError ? err.message : "Couldn't update that movie.");
    }
  }

  async function handleReorderLoose(orderedIds: string[]) {
    const byId = new Map(looseMovies.map((m) => [m._id, m]));
    const reordered = orderedIds.map((movieId) => byId.get(movieId)!).filter(Boolean);
    mutateLoose(reordered, false);
    try {
      await reorderMovies(null, orderedIds);
    } catch (err) {
      mutateLoose(looseMovies, false);
      showError(err instanceof ApiError ? err.message : "Couldn't save the new order.");
    }
  }

  async function handleDeleteLoose(movie: Movie) {
    try {
      await deleteMovie(movie._id);
      showSuccess(`Removed "${movie.title}"`);
      mutateLoose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this movie.");
    }
  }

  const nothingAtAll = roots.length === 0 && looseMovies.length === 0;

  return (
    <div className="flex flex-col gap-10">
      <OverviewHeader watched={totalWatched} total={totalMovies} onAdd={() => setAddOpen(true)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs />
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Button variant="glass" size="sm" onClick={() => setCollectionModalOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" />
            New collection
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : nothingAtAll ? (
        <EmptyState
          icon={LibraryBig}
          title="This shelf is empty."
          description="Add a movie or paste a list to start building it."
          action={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                Add movies
              </Button>
              <Button variant="glass" onClick={() => setCollectionModalOpen(true)}>
                New collection
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {roots.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roots.map((collection) => (
                <CollectionCard
                  key={collection._id}
                  collection={collection}
                  onRename={() => setRenaming(collection)}
                  onDelete={() => setDeleting(collection)}
                />
              ))}
            </div>
          )}

          {looseMovies.length > 0 && (
            <section className="flex flex-col gap-2.5">
              {roots.length > 0 && (
                <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  Movies
                </h2>
              )}
              <div className="glass rounded-3xl p-2 sm:p-3">
                <SortableMovieList
                  movies={looseMovies}
                  view={view}
                  onToggle={(movieId) => {
                    const movie = looseMovies.find((m) => m._id === movieId);
                    if (movie) handleToggleLoose(movie);
                  }}
                  onEdit={(movie) => setEditingMovie(movie)}
                  onDelete={(movie) => setDeletingMovie(movie)}
                  onReorder={handleReorderLoose}
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
        onAdded={() => {
          mutate();
          mutateLoose();
        }}
      />

      <CollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collections={collections}
        onSaved={() => mutate()}
      />

      <CollectionModal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        collections={collections}
        editingCollection={renaming}
        onSaved={() => mutate()}
      />

      <EditMovieModal
        open={Boolean(editingMovie)}
        onClose={() => setEditingMovie(null)}
        movie={editingMovie}
        collections={collections}
        onSaved={() => {
          mutate();
          mutateLoose();
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingMovie)}
        onClose={() => setDeletingMovie(null)}
        onConfirm={() => {
          if (deletingMovie) return handleDeleteLoose(deletingMovie);
        }}
        title={`Remove "${deletingMovie?.title}"?`}
        description="This will permanently remove the movie from your library."
        confirmLabel="Remove"
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) return handleDelete(deleting);
        }}
        title={`Delete "${deleting?.name}"?`}
        description={
          deleting
            ? deleting.stats.movieCount > 0 || deleting.stats.childCollectionCount > 0
              ? `This will permanently remove ${deleting.stats.movieCount} movie${deleting.stats.movieCount === 1 ? "" : "s"} and ${deleting.stats.childCollectionCount} sub-collection${deleting.stats.childCollectionCount === 1 ? "" : "s"} inside it.`
              : "This will permanently remove the collection."
            : ""
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
