import { API_PATHS } from "./apiPaths";
import axiosInstance from "./url.service";

const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.SEND_OTP, {
      phoneNumber,
      phoneSuffix,
      email,
    });
    console.log("send-otp response:", response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

const verifyOtp = async (phoneNumber, phoneSuffix, email, otp) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_OTP, {
      phoneNumber,
      phoneSuffix,
      email,
      otp,
    });
    console.log("verify-otp response:", response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

const updateProfile = async (updateData) => {
  try {
    const response = await axiosInstance.put(
      API_PATHS.AUTH.UPDATE_PROFILE,
      updateData
    );
    console.log("updateProfile response:", response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

const checkAuth = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.AUTH.CHECK_AUTH);
    console.log("updateProfile response:", response.data);
    if (response.data.status === "Success") {
      return { isAuthenticated: true, user: response?.data?.data };
    } else {
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error("checkAuth error:", error);
    return { isAuthenticated: false };
  }
};

const logout = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.AUTH.LOGOUT);
    console.log("logout response:", response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.AUTH.GET_ALL_USERS);
    console.log("getAllUsers response:", response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export { sendOtp, verifyOtp, updateProfile, checkAuth, logout, getAllUsers };
