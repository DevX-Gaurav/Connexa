import User from "../models/user.model.js";
import sendOtpToEmail from "../services/email.service.js";
import optGenerator from "../utils/otpGenerator.js";
import response from "../utils/responseHandler.js";
import {
  sendOtpToPhoneNumber,
  verifyPhoneOtp,
} from "../services/phone.service.js";
import generateToken from "../utils/generateToken.js";
import { uploadToCloudinary } from "../Config/cloudinary.js";
import Conversation from "../models/conversation.model.js";

/* sendOtp */
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = optGenerator();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;

  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpToEmail(email, otp);
      return response(res, 200, "Otp send to your email", { email });
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and phone suffix are required");
    }
    const fullPhoneNumber = `${phoneSuffix} ${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber, phoneSuffix });
    }
    await sendOtpToPhoneNumber(fullPhoneNumber);
    await user.save();
    return response(res, 200, "Otp send successfully", user);
  } catch (error) {
    console.error("error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* verifyOtp */
const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email, otp } = req.body;

    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) != String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired otp");
      }
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and phone suffix are required");
      }
      const fullPhoneNumber = `${phoneSuffix} ${phoneNumber}`;
      user = await User.findOne({ phoneNumber });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const result = await verifyPhoneOtp(fullPhoneNumber, otp);
      if (result.status != "approved") {
        return response(res, 400, "Invalid otp");
      }
      user.isVerified = true;
      await user.save();
    }
    const token = generateToken(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    return response(res, 200, "Otp verified successfully", { token, user });
  } catch (error) {
    console.error("error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* updateProfile */
const updateProfile = async (req, res) => {
  try {
    const { username, agreed, about } = req.body;
    const userId = req.user;
    console.log("userId", userId);

    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadToCloudinary(file);
      console.log("uploadResult", uploadResult);
      user.avatar = uploadResult?.secure_url;
    } else if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }
    if (username) user.username = username;
    if (agreed !== undefined)
      user.agreed = agreed; /* if (agreed) user.agreed = agreed; */
    if (about) user.about = about;
    await user.save();
    console.log("user: ", user);
    return response(res, 200, "profile updated successfully", user);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* logout */
const logout = async (req, res) => {
  try {
    res.cookie("auth_token", "", { expires: new Date(0) });
    return response(res, 200, "Logout successfully!");
  } catch (error) {
    console.error("error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* checkAuthenticate */
const checkAuthenticate = async (req, res) => {
  try {
    const userId = req.user;
    if (!userId) {
      return response(res, 400, "Unauthorized user! Access denied.");
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "user not found");
    }
    return response(res, 200, "You are good to go!", user);
  } catch (error) {
    console.error("Error:", error);
    return response(res, 500, "Internal server error");
  }
};

/* getAllUsersExcept me */
const getAllUserExceptMe = async (req, res) => {
  try {
    const loggedUser = req.user;
    const users = await User.find({ _id: { $ne: loggedUser } })
      .select("username avatar lastSeen isOnline about phoneNumber phoneSuffix")
      .lean();
    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedUser, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );
    return response(
      res,
      200,
      "User retrieved successfully!!",
      usersWithConversation
    );
  } catch (error) {
    console.error("Error:", error);
    return response(res, 500, "Internal server error");
  }
};

export {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticate,
  getAllUserExceptMe,
};
