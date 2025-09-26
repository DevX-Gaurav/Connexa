import express from "express";
import {
  checkAuthenticate,
  getAllUserExceptMe,
  logout,
  sendOtp,
  updateProfile,
  verifyOtp,
} from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../Config/cloudinary.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.put("/update-profile", authMiddleware, multerMiddleware, updateProfile);
router.get("/logout", authMiddleware, logout);
router.get("/check-auth", authMiddleware, checkAuthenticate);
router.get("/users", authMiddleware, getAllUserExceptMe);

export default router;
