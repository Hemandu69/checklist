import { Router } from "express";
import { searchHandler } from "../controllers/searchController";

const router = Router();

router.get("/", searchHandler);

export default router;
