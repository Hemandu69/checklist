"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Movie } from "@/types";
import { MovieCard } from "./MovieCard";

export const MOVIE_GRID_CLASSES =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5";

function SortableCard({
  movie,
  onToggle,
  onEdit,
  onDelete,
}: {
  movie: Movie;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: movie._id,
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <MovieCard
        movie={movie}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
}

export function SortableMovieList({
  movies,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: {
  movies: Movie[];
  onToggle: (id: string) => void;
  onEdit?: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = movies.findIndex((m) => m._id === active.id);
    const newIndex = movies.findIndex((m) => m._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(movies, oldIndex, newIndex);
    onReorder(reordered.map((m) => m._id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={movies.map((m) => m._id)} strategy={rectSortingStrategy}>
        <div className={MOVIE_GRID_CLASSES}>
          {movies.map((movie) => (
            <SortableCard
              key={movie._id}
              movie={movie}
              onToggle={() => onToggle(movie._id)}
              onEdit={onEdit ? () => onEdit(movie) : undefined}
              onDelete={onDelete ? () => onDelete(movie) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
