import jwt from "jsonwebtoken";
import response from "../utils/responseHandler.js";

const authMiddleware = async (req, res, next) => {
  // const authToken = req?.cookies?.auth_token;

  // if (!authToken) {
  //   return response(res, 404, "Access denied due to missing token value");
  // }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return response(res, 404, "Access denied due to missing token value");
  }
  const token = authHeader.split(" ")[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decode.userId;
    // console.log("decode: ", req.user);
    next();
  } catch (error) {
    console.error("Error:", error);
    return response(res, 404, "Invalid or expired token");
  }
};

export default authMiddleware;
