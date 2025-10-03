import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";
import { BASE_URI } from "./apiPaths";

let socket = null;

export const initializeSocket = () => {
  if (socket) return socket;

  const user = useUserStore.getState().user;

  const BACKEND_URI = BASE_URI;

  socket = io(BACKEND_URI, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  /* connection events */
  socket.on("connect", () => {
    console.log("socket connected", socket.id);
    socket.emit("user_connected", user._id);
  });

  /* connect_error */
  socket.on("connect_error", (error) => {
    console.error("socket connection error", error);
  });

  /* disconnect event */
  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
