import { Router } from "express";
import {
  createCollectionHandler,
  deleteCollectionHandler,
  getCollectionDetail,
  listCollections,
  updateCollectionHandler,
} from "../controllers/collectionsController";

const router = Router();

router.get("/", listCollections);
router.post("/", createCollectionHandler);
router.get("/:id", getCollectionDetail);
router.patch("/:id", updateCollectionHandler);
router.delete("/:id", deleteCollectionHandler);

export default router;
