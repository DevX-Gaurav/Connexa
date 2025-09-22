import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    reciever: {
      type: mongoose.Schema.ObjecId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
    },
    imageOrVideoUrl: {
      type: String,
    },
    contentType: {
      type: String,
      enum: ["image", "video", "text"],
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.ObjecId,
          ref: "User",
        },
        emoji: String,
      },
    ],
    messageStatus: {
      type: String,
      defaule: "send",
    },
  },
  { timestamps: true }
);

const messageModel = mongoose.model("Message", messageSchema);
export default messageModel;
