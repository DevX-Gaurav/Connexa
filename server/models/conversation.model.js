import mongoose from "mongoose";

const conversionSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    lastMessage: {
      type: mongoose.Schema.ObjecId,
      ref: "Message",
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const conversationModel = mongoose.model("Conversation", conversionSchema);

export default conversationModel;
