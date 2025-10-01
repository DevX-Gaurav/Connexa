export const BASE_URI = import.meta.env.VITE_API_URL;

export const API_PATHS = {
  AUTH: {
    SEND_OTP: "/api/auth/send-otp" /* post */,
    VERIFY_OTP: "/api/auth/verify-otp" /* post */,
    UPDATE_PROFILE: "/api/auth/update-profile" /* put */,
    LOGOUT: "/api/auth/logout" /* get */,
    CHECK_AUTH: "/api/auth/check-auth" /* get */,
    GET_ALL_USERS: "/api/auth/users" /* get */,
  },

  CHAT: {
    SEND_MESSAGE: "/api/chat/send-message" /* post */,
    GET_ALL_CONVERSATION: "/api/chat/conversation" /* get */,
    GET_MESSAGE: "/api/chat/conversation/:conversationId/messages" /* get */,
    MARK_AS_READ: "/api/chat/messages/read" /* put */,
    DELETE_MESSAGE: "/api/chat/messages/:messageId" /* delete */,
  },

  STATUS: {
    CREATE_STATUS: "/api/status/" /* post */,
    GET_STATUS: "/api/status/" /* get */,
    VIEW_STATUS: "/api/status/:statusId/view" /* put */,
    DELETE_STATUS: "/api/status/:statusId" /* delete */,
  },
};
