import response from "../utils/responseHandler.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { uploadToCloudinary } from "../Config/cloudinary.js";

const sendMessage = async (req, res) => {
  try {
    const { senderId, recieverId, content, messageStatus } = req.body;
    const file = req.file;
    const participants = [senderId, recieverId].sort();
    /* check if participants already exists or not */
    let conversation = await Conversation.findOne({
      participants: participants,
    });
    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = null;

    /* handle file upload */
    if (file) {
      const uploadFile = await uploadToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(
          res,
          400,
          "Failed to upload file from sendMessage controller."
        );
      }
      imageOrVideoUrl = uploadFile?.secure_url;
      if (file.mimetype.startswith("image")) {
        contentType = "image";
      } else if (file.mimetype.startswith("video")) contentType = "video";
      else {
        return response(
          res,
          400,
          "unsupported file type from sendMessage controller."
        );
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content required.");
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      reciever: recieverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });
    await message.save();
    if (message?.content) conversation.lastMessage = message?._id;
    /* conversation.unreadCount += 1; */
    conversation.unreadCount.set(
      recieverId,
      (conversation.unreadCount.get(recieverId) || 0) + 1
    );
    conversation.updatedAt = new Date();
    await conversation.save();

    const populateMessage = await Message.findOne(message?._id)
      .populate("sender", "username avatar")
      .populate("reciever", "username avatar");

    /* emit socket event for realtime*/
    if (req.io && req.socketUserMap) {
      /* broadcast to all the connecting users except the user itself. */
      const recieverSocketId = req.socketUserMap.get(recieverId);
      if (recieverSocketId) {
        req.io.to(recieverSocketId).emit("recieved_message", populateMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 201, "Message send successfully", populateMessage);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* get all conversation */
const getAllConversation = async (req, res) => {
  try {
    const userId = req.user;
    let conversation = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender reciever",
          select: "username avatar",
        },
      })
      .sort({ updatedAt: -1 });
    return response(res, 201, "successful conversation", conversation);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* get specific conversation */
const getMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "conversation not found");
    }
    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Not authorized to view this conversation");
    }
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username avatar")
      .populate("reciever", "username avatar")
      .sort("createdAt");

    await Message.updateMany(
      {
        conversation: conversationId,
        reciever: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );
    // conversation.unreadCount = 0;
    // await conversation.save();
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    return response(res, 200, "message retrieved", messages);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* markasread */
const markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user;

    /* get relevant message to determine senders */
    let messages = await Message.find({
      _id: { $in: messageIds },
      reciever: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        reciever: userId,
      },
      { $set: { messageStatus: "read" } }
    );

    /*notify to original user*/
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updatedMessage);
          await message.save();
        }
      }
    }

    return response(res, 200, "message marked as read", messages);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* delete messages */
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user;
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "message not found");
    }
    if (message.sender.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this message");
    }
    await message.deleteOne();
    /* emit socket event */
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(
        message.reciever.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }

    return response(res, 200, "message deleted");
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

export {
  sendMessage,
  getAllConversation,
  getMessage,
  markAsRead,
  deleteMessage,
};
