import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";
import { API_PATHS } from "../services/apiPaths";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  currentUser: null,

  /* socket event listeners setup */
  initSocketListener: () => {
    const socket = getSocket();
    if (!socket) return;

    /* remove existing listeners to prevent duplicate handlers */
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("message_deleted");

    /* listen for incomming messages */
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

    /* confirm message delivery */
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg
        ),
      }));
    });

    /* update message status */
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    /* handle reaction on message */
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    /* handle delete message from local state */
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    /* handle any message sending error */
    socket.on("message_error", (error) => {
      console.error("message error", error);
    });

    /* listener for typing user */
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }
        return { typingUsers: newTypingUsers };
      });
    });

    /* track user online/ofline status */
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    /* emit status check for all users in conversationn list */
    const { conversations, currentUser } = get();
    if (conversations?.data?.length > 0) {
      conversations.data?.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== currentUser?._id
        );

        if (otherUser?._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(status.userId, {
                isOnline: status.isOnline,
                lastSeen: status.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  /* fetching all conversations */
  fetchConversation: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(
        API_PATHS.CHAT.GET_ALL_CONVERSATION
      );
      set({ conversations: data, loading: false });
      get().initSocketListener();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  /* fetch message for a conversation */
  fetchMessage: async (conversationId) => {
    try {
      if (!conversationId) return;
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(
        API_PATHS.CHAT.GET_MESSAGE(conversationId)
      );
      /* .get(`/chat/conversation/${conversationId/messages}`) */
      const messageArray = data.data || data || [];
      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });

      /* mark unread message as read */
      const { markMessagesAsRead } = get();
      markMessagesAsRead();

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return [];
    }
  },

  /* send Message in real time */
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

    const { conversations, currentUser } = get();
    let conversationId = null;
    if (conversations?.data?.length > 0) {
      const conversationdata = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );
      if (conversationdata) {
        conversationId = conversationdata._id;
        set({ currentConversation: conversationId });
      }
    }
    /* temp messsage before actual response */
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversations: conversationId,
      imageOrVideoUrl:
        media && typeof media !== "string" ? URL.createObjectURL(media) : null,
      content: content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      createdAt: new Date().toISOString(),
      messageStatus,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const { data } = await axiosInstance.post(
        API_PATHS.CHAT.SEND_MESSAGE,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const messageData = data.data || data;
      /* replace optimisitic message with the real one */
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));
      /* changes made */
      const socket = getSocket();
      if (socket) {
        socket.emit("send_message", messageData);
      }
    } catch (error) {
      console.error("error sending message from chatStore", error);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg
        ),
        error: error?.response?.data?.message || error?.message,
      }));
      throw error;
    }
  },

  /* recieve message */
  receiveMessage: (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } =
      get(); /* message as one of the selected  */
    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return;
    if (message.conversations === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));

      /* automatically mark as read. */
      if (message.receiver?._id === currentUser?._id) {
        get().markMessagesAsRead();
      }
    }

    /* update conversation preview and unread count*/
    set((state) => {
      const updateConversation = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversations) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount:
              message?.receiver?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });
      return {
        conversations: {
          ...state.conversations,
          data: updateConversation,
        },
      };
    });
  },

  /* mark as read */
  markMessagesAsRead: async () => {
    const { messages, currentUser } = get();
    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" && msg.receiver?._id === currentUser?._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;
    try {
      const { data } = await axiosInstance.put(API_PATHS.CHAT.MARK_AS_READ, {
        messageId: unreadIds,
      });
      console.log("message mark as read", data);

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
        ),
      }));
      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0]?.sender?._id,
        });
      }
    } catch (error) {
      console.error("Failed to mark message as read", error);
    }
  },

  /* delete messageg */
  deletedMessage: async (messageId) => {
    try {
      await axiosInstance.delete(API_PATHS.CHAT.DELETE_MESSAGE(messageId));
      set((state) => ({
        messages: state.messages?.filter((msg) => msg?._id !== messageId),
      }));
      /* few changes made */
      const socket = getSocket();
      if (socket) {
        socket.emit("delete_message", { deletedMessageId: messageId });
      }
      return true;
    } catch (error) {
      console.error("deleting error message", error);
      set({ error: error.response?.data?.message || error.message });
      return false;
    }
  },

  /* add / change reactions */
  addReactions: async (messageId, emoji, currentUser) => {
    const socket = getSocket();

    console.log(
      "messageId",
      messageId,
      " emoji:",
      emoji,
      "currentUser",
      currentUser
    );

    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },

  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  stopTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    ) {
      return false;
    }
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanUp: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
      currentUser: null,
    });
  },
}));
