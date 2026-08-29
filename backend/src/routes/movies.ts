import { Router } from "express";
import {
  bulkAddMoviesHandler,
  createMovieHandler,
  deleteMovieHandler,
  listMovies,
  refreshTmdbHandler,
  reorderMoviesHandler,
  updateMovieHandler,
} from "../controllers/moviesController";

const router = Router();

router.get("/", listMovies);
router.post("/", createMovieHandler);
router.post("/bulk", bulkAddMoviesHandler);
router.patch("/reorder", reorderMoviesHandler);
router.post("/:id/refresh-tmdb", refreshTmdbHandler);
router.patch("/:id", updateMovieHandler);
router.delete("/:id", deleteMovieHandler);

export default router;
