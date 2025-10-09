import React, { useState } from "react";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import countries from "../../utils/countries";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/themeStore";
import { motion } from "framer-motion";
import windowImage from "../../assets/window.png";
import {
  FaArrowLeft,
  FaChevronDown,
  FaPlus,
  FaUser,
} from "react-icons/fa";
import Spinner from "../../utils/Spinner";
import { sendOtp, updateProfile, verifyOtp } from "../../services/user.service";
import toast from "react-hot-toast";

/* validation schema */

const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number be digit")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Enter a valid email address")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "Otp mus be of exactly 6 digits")
    .required("Otp is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup
    .bool()
    .oneOf([true], "You must agree to the terms before proceeding"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } =
    useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch: watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const ProgressBar = () => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200 "
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  const filterCountry = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      if (email) {
        const response = await sendOtp(null, null, email);
        if (response.status === "Success") {
          toast.success("OTP send to your email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const response = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (response.status === "Success") {
          toast.success("OTP send to phone number");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      toast.error("Failed to send OTP");
      setError(error.message || "Failed to send otp");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone or email data is missing");
      }
      const otpString = otp.join("");
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          null,
          otpString
        );
      }
      if (response.status === "Success") {
        toast.success("OTP verified successfully");
        const token = response.data?.token;
        localStorage.setItem("auth_token", token);
        console.log("response", response);

        const user = response.data?.user;
        if (user?.username && user?.avatar) {
          setUser(user);
          toast.success("Welcome back to Connexa");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      }
    } catch (error) {
      toast.error("Failed to verify otp");
      setError(error.message || "Failed to verify otp");
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);

      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("avatar", selectedAvatar);
      }
      await updateProfile(formData);
      toast.success("Welcome back to Connexa");
      navigate("/");
      resetLoginState();
    } catch (error) {
      toast.error("Failed to update user profile");
      setError(error.message || "Failed to update user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 2}}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className={`w-24 h-24  rounded-full mx-auto mb-2 flex items-center justify-center`}
        >
          <img
            src={windowImage}
            alt="loader image"
            className="w-20 h-20 object-cover"
          />
        </motion.div>

        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800  "
          }`}
        >
          Connexa Login
        </h1>
        <ProgressBar />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {step === 1 && (
          <form
            onSubmit={handleLoginSubmit(onLoginSubmit)}
            className="space-y-4"
          >
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4 `}
            >
              Enter your Email or phone number to recieve an Otp
            </p>
            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    className={`flex-shrink-0 cursor-pointer z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white hover:bg-gray-700 bg-gray-700 border border-gray-600"
                        : "text-gray-900 hover:bg-gray-200  bg-gray-100 border border-gray-300 "
                    } rounded-s-lg   focus:ring-4 focus:outline-none focus:ring-gray-100  `}
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <span className="flex gap-1 ">
                      <img
                        src={`https://flagsapi.com/${selectedCountry.alpha2}/flat/64.png`}
                        alt={`${selectedCountry.flag} flag`}
                        className="h-5 w-5 mr-1 object-cover rounded-sm"
                      />
                      {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" size={12} />
                  </button>

                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md overflow-auto max-h-60 shadow-lg`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="search countries"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 border ${
                            theme === "dark"
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none focus:right-2 focus:ring-green-500  `}
                        />
                      </div>
                      {filterCountry.map((country) => (
                        <button
                          key={country.alpha2}
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          } focus:outline-none focus:bg-gray-100 `}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdown(false);
                          }}
                        >
                          <img
                            src={`https://flagsapi.com/${country.alpha2}/flat/64.png`}
                            alt={`${selectedCountry.flag} flag`}
                            className="h-5 w-5 mr-1 object-cover rounded-sm"
                          />{" "}
                          {country.dialCode} {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  placeholder="Phone Number"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white "
                      : "bg-white border-gray-300"
                  } rounded-md  focus:outline-none focus:right-2 focus:ring-green-500 ${
                    loginErrors.phoneNumber ? "border-red-500" : ""
                  }  `}
                />
              </div>
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* divider with or */}

            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300 " />
              <span className="mx-3 text-gray-500 text-sm font-medium">or</span>
              <div className="flex-grow h-px bg-gray-300" />
            </div>

            {/* email input box */}
            <div
              className={`flex items-center border rounded-md px-3 py-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300 "
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500 "
                } `}
              />
              <input
                type="email"
                {...loginRegister("email")}
                value={email}
                placeholder="Email (optional)"
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent focus:outline-none ${
                  theme === "dark" ? " text-white " : "text-black"
                }  ${loginErrors.email ? "border-red-500" : ""}  `}
              />

              {loginErrors.email && (
                <p className="text-red-500 text-sm">
                  {loginErrors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}

        {step == 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <div
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Please enter the 6-digits OTP send to{" "}
              {userPhoneData.phoneNumber && userPhoneData.phoneSuffix
                ? userPhoneData.phoneSuffix
                : " your Email"}
              {userPhoneData?.phoneNumber && userPhoneData?.phoneNumber}
            </div>
            <div className="flex justify-between">
              {otp.map((digit, idx) => (
                <input
                  type="text"
                  id={`otp-${idx}`}
                  key={idx}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className={`w-12 h-12 text-center border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500  ${
                    otpErrors.otp ? "border-red-500" : ""
                  } `}
                />
              ))}
            </div>

            {otpErrors.otp && (
              <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
            )}
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
            >
              {loading ? <Spinner /> : "Verify OTP"}
            </button>

            <button
              onClick={handleBack}
              className={`w-full mt-2 py-2 rounded-md hover:bg-gray-300 transition flex items-center justify-center ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700 "
              }`}
            >
              <FaArrowLeft className="mr-2" />
              Wrong number? Go back
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                <img
                  src={profilePicture || selectedAvatar}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover"
                />

                <label
                  htmlFor="profile-picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-all duration-300"
                >
                  <FaPlus className="w-4 h-4" />
                </label>
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  /* onClick={() => console.log("setUser", setUser)} */
                />
              </div>

              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                } mb-2`}
              >
                Choose an avatar
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avt, idx) => (
                  <img
                    src={avt}
                    alt={`Avatar ${idx + 1}`}
                    key={idx}
                    className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${
                      selectedAvatar === avt ? "ring-2 ring-green-500" : ""
                    }`}
                    onClick={() => setSelectedAvatar(avt)}
                  />
                ))}
              </div>
            </div>

            <div className="relative">
              <FaUser
                className={`absolute left-3 top-1/2 transform  -translate-y-1/2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                {...profileRegister("username")}
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
              />

              {profileErrors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {profileErrors.username.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...profileRegister("agreed")}
                className={`rounded ${
                  theme === "dark"
                    ? "text-green-500 bg-gray-700"
                    : "text-green-500"
                } focus:ring-green-500`}
              />

              <label
                htmlFor="terms"
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                I agree to the{" "}
                <a href="#" className="text-red-500 hover:underline">
                  Terms and Conditions
                </a>
              </label>
            </div>
            {profileErrors.agreed && (
              <p className="text-red-500 text-sm mt-1">
                {profileErrors.agreed.message}
              </p>
            )}

            <button
              type="submit"
              disabled={!watch("agreed") || loading}
              className={`w-full bg-green-500 text-white font-bold py-3 rounded-md hover:bg-green-600 transition duration-300 transform hover:scale-105 ease-in-out flex items-center justify-center text-lg ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }  `}
            >
              {loading ? <Spinner /> : "Create profile"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
