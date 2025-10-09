import { Server } from "socket.io";
import Status from "../models/status.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import handleVideoCallEvent from "./videoCall.service.js";
import socketMiddleware from "../middleware/socketMiddleware.js";

/* map to store all the online user->userId, socketId */
const onlineUsers = new Map();

/* map to track typing status->userId->[conversation]:boolean  */
const typingUsers = new Map();

/* */
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000,
  });

  /* socket middleware */
  io.use(socketMiddleware);

  /* when a new socket connection is established */
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    let userId = null;

    /* handle user connection and mark online in db */
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId); /* join a personal room for direct emits */

        /* update user status in db */
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        /* notify all users that the user is online now */
        io.emit("user_status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error is user connection", error);
      }
    });

    /* return online status of requested user */
    socket.on("get_user_status", async (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    /* forward message to reciever if online*/
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("Error sending message: ", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    /* update message as read and notify sender */
    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((msgId) => {
            io.to(senderSocketId).emit("message_status_update", {
              msgId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error updating message read status: ", error);
      }
    });

    /* delete message and notify both users */
    socket.on("delete_message", async ({ deletedMessageId }) => {
      try {
        // Optional: Verify/delete in DB if not already done by API
        await Message.findByIdAndDelete(deletedMessageId);

        // Get sender/receiver from message (assuming you pass or fetch)
        const message = await Message.findById(deletedMessageId).populate(
          "sender receiver"
        );
        if (!message) return;

        const senderSocket = onlineUsers.get(message.sender._id.toString());
        const receiverSocket = onlineUsers.get(message.receiver._id.toString());

        const deleteEvent = { deletedMessageId };

        if (senderSocket)
          io.to(senderSocket).emit("message_deleted", deleteEvent);
        if (receiverSocket)
          io.to(receiverSocket).emit("message_deleted", deleteEvent);
      } catch (error) {
        console.error("Error handling message delete: ", error);
      }
    });

    /* handle typing start event and autostops after 3 sec */
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (!typingUsers.has(userId)) typingUsers.set(userId, {});
      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      /* clear any existing timeout */
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      /* auto-stop after 3 sec */
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 3000);

      /* notify reciver */
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    /* add or update emoji reaction on message */
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId: reactionUserId }) => {
        console.log("messageId from backend socketService", messageId);
        console.log("userId from backend socketService", userId);

        try {
          const message = await Message.findById(messageId);
          console.log("message from add reactions", message);
          if (!message) return;

          const existingIndex = message.reactions.findIndex(
            (r) => r.user?._id.toString() === reactionUserId
          );

          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              /* remove same reaction */
              message.reactions.splice(existingIndex, 1);
            } else {
              /* change emoji */
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            /* add new reactions */
            message.reactions.push({ user: reactionUserId, emoji });
          }
          await message.save();

          const populatedMessage = await Message.findOne(message?._id)
            .populate("sender", "username avatar")
            .populate("receiver", "username avatar")
            .populate("reactions.user", "username");

          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.sender._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver._id.toString()
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);

          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          console.error("Error in handling emojis", error);
        }
      }
    );

    /* handle video call events */
    handleVideoCallEvent(socket, io, onlineUsers);

    /* handle disconnection and mark user offline */
    const handleDisconnected = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);
        /* clear all typing timeouts */
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);
        console.log(`user ${userId} disconnected`);
      } catch (error) {
        console.error("Error handling disconnection", error);
      }
    };

    socket.on("disconnect", handleDisconnected);
  });

  io.socketUserMap = onlineUsers;
  return io;
};

export default initializeSocket;
