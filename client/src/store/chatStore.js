import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";
import { API_PATHS } from "../services/apiPaths";

export const useChatStore = create((set, get) => ({
  conversation: [],
  currenctConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  /* socket event listeners setup */
  initSocketListener: () => {
    const socket = getSocket();
    if (!socket) return;

    /* remove existing listeners to prevent duplicate handlers */
    socket.off("recieve_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("message_deleted");

    /* listen for incomming messages */
    socket.on("recieve_message", (message) => {});

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
    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations.data?.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== get().currentUser._id
        );

        if (otherUser._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(state.userId, {
                isOnline: state.isOnline,
                lastSeen: state.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  /* fetching all conversations */
  fetchConversation: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(
        API_PATHS.CHAT.GET_ALL_CONVERSATION
      );
      set({ conversation: data, loading: false });
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
        currenctConversation: conversationId,
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

    const socket = getSocket();
    const { conversation } = get();
    let conversationId = null;
    if (conversation?.data?.length > 0) {
      const conversationdata = conversation.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );
      if (conversationdata) {
        conversationId = conversationdata._id;
        set({ currenctConversation: conversationId });
      }
    }

    /* temp messsage before actual response */
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
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
      /* replacce optimisitic message with the real one */
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));
      return messageData;
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
  recieveMessage: (message) => {
    if (!message) return;
    const { currenctConversation, currentUser } =
      get(); /* message as one of the selected  */
    const messageExists = message.some((msg) => msg._id === message._id);
    if (messageExists) return;

    if (message.conversation === currenctConversation) {
      set((state) => ({
        messages: [...state.message, message],
      }));

      /* automatically mark as read. */
      if (message.receiver?._id === currentUser?._id) {
        get().markMessagesAsRead();
      }
    }

    /* update conversation preview and unread count*/
    set((state) => {
      const updateConversation = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount:
              message?.reciever?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });
      return {
        conversation: {
          ...state.conversations,
          data: updateConversation,
        },
      };
    });
  },

  /* mark as read */
  markMessagesAsRead: async () => {
    const { messages, currenctUser } = get();
    if (!messages.length || !currenctUser) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" &&
          msg.receiver?._id === currenctUser?._id
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
        messages: state.message.map((msg) =>
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
      return true;
    } catch (error) {
      console.error("deleting error message", error);
      set({ error: error.response?.data?.message || error.message });
      return false;
    }
  },

  /* add / change reactions */
  addReactions: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },

  startTyping: (receiverId) => {
    const { currenctConversation } = get();
    const socket = getSocket();
    if (socket && currenctConversation && receiverId) {
      socket.emit("typing_start", {
        conversationId: currenctConversation,
        receiverId,
      });
    }
  },

  stopTyping: (receiverId) => {
    const { currenctConversation } = get();
    const socket = getSocket();
    if (socket && currenctConversation && receiverId) {
      socket.emit("typing_stop", {
        conversationId: currenctConversation,
        receiverId,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currenctConversation } = get();
    if (
      !currenctConversation ||
      !typingUsers.has(currenctConversation) ||
      !userId
    ) {
      return false;
    }
    return typingUsers.get(currenctConversation).has(userId);
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
      conversation: [],
      currenctConversation: null,
      messages: [],
      onlineUsers: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
