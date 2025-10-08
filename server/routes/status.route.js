import express from "express";
import {
  createStatus,
  getStatus,
  viewStatus,
  deleteStatus,
} from "../controllers/status.controller.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../Config/cloudinary.js";

const router = express.Router();

router.post("/", authMiddleware, multerMiddleware, createStatus);
router.get("/", authMiddleware, multerMiddleware, getStatus);
router.put("/:statusId/view", authMiddleware, multerMiddleware, viewStatus);
router.delete("/:statusId", authMiddleware, multerMiddleware, deleteStatus);
// router.get("/:statusId/viewers", authMiddleware, multerMiddleware, viewStatus);

export default router;
