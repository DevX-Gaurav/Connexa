import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      requrired: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneSuffix: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      validate: {
        validator: (value) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email format.",
      },
      lowercase: true,
    },
    emailOtp: {
      type: String,
    },
    emailOtpExpiry: {
      type: Date,
    },
    avatar: {
      type: String,
    },
    about: {
      type: String,
    },
    lastSeen: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      defaule: false,
    },
    agreed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
