import mongoose from "mongoose";

const conversionSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: "Message",
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    /* unreadCount: { type: Number, default: 0, }, */
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversionSchema);

export default Conversation;
