import { Router } from "express";
import collectionsRouter from "./collections";
import moviesRouter from "./movies";
import searchRouter from "./search";

const router = Router();

router.use("/collections", collectionsRouter);
router.use("/movies", moviesRouter);
router.use("/search", searchRouter);

export default router;
