import express from "express";
import {
  sendOtp,
  updateProfile,
  verifyOtp,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/update-profile", updateProfile);

export default router;
