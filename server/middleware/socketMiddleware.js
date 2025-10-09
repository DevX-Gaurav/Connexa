import jwt from "jsonwebtoken";
import response from "../utils/responseHandler.js";

const socketMiddleware = async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return next(new Error("Access denied due to missing token value"));
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);

    socket.user = decode;

    next();
  } catch (error) {
    console.error("Error:", error);
    return new Error("Invalid or expired token");
  }
};

export default socketMiddleware;
