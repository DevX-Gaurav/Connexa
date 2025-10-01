import express from "express";
import {
  sendMessage,
  getAllConversation,
  getMessage,
  markAsRead,
  deleteMessage,
} from "../controllers/chat.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../Config/cloudinary.js";

const router = express.Router();

router.post("/send-message", authMiddleware, multerMiddleware, sendMessage);
router.get("/conversation", authMiddleware, getAllConversation);
router.get(
  "/conversation/:conversationId/messages",
  authMiddleware,
  getMessage
);
router.put("/messages/read", authMiddleware, markAsRead);
router.delete("/messages/:messageId", authMiddleware, deleteMessage);

export default router;
