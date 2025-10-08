import React, { useEffect, useState } from "react";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/themeStore";
import { updateProfile } from "../services/user.service";
import toast from "react-hot-toast";
import Layout from "./Layout";
import { motion } from "framer-motion";
import {
  FaCamera,
  FaCheck,
  FaLess,
  FaPencilAlt,
  FaSmile,
} from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";

const UserDetails = () => {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [showAboutEmoji, setShowAboutEmoji] = useState(false);
  const [showNameEmoji, setShowNameEmoji] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (user) {
      setName(user.username || "");
      setAbout(user.about || "");
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (field) => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (field === "name") {
        formData.append("username", name);
        setIsEditingName(false);
        setShowNameEmoji(false);
      } else if (field === "about") {
        formData.append("about", about);
        setIsEditingAbout(false);
        setShowAboutEmoji(false);
      }
      if (profilePicture && field === "profile") {
        formData.append("media", profilePicture);
      }
      const updated = await updateProfile(formData);
      setUser(updated?.data);
      setProfilePicture(null);
      setPreview(null);
      toast.success("Profile updated!!");
    } catch (error) {
      console.error("failed to updated profile", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiSelect = (emoji, field) => {
    if (field === "name") {
      setName((prev) => prev + emoji.emoji);
      setShowNameEmoji(false);
    } else {
      setAbout((prev) => prev + emoji.emoji);
      setShowAboutEmoji(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full border-r flex min-h-screen ${
          theme === "dark"
            ? "bg-[rgb(17,27,33)] border-gray-600 text-white"
            : "bg-gray-100 border-gray-200 text-black"
        }`}
      >
        <div className="w-full rounded-lg p-6">
          <div className="flex items-center mb-6">
            <h1 className="text-2xl font-normal font-serif">Profile</h1>
          </div>
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <img
                  src={preview || user?.avatar}
                  alt="profilePicture"
                  className="w-40 h-40 rounded-full  object-cover"
                />

                <label
                  htmlFor="profileUpload"
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="text-white text-center">
                    <FaCamera className="h-8 w-8 mx-auto mb-2 " />
                    <span className="text-sm ">Change</span>
                  </div>

                  <input
                    type="file"
                    id="profileUpload"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {preview && (
              <div className="flex justify-center gap-4 mt-4 ">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded "
                  onClick={() => {
                    handleSave("profile");
                  }}
                >
                  {loading ? "Saving..." : "Change"}
                </button>
                <button
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded "
                  onClick={() => {
                    setPreview(null);
                    setProfilePicture(null);
                  }}
                >
                  Discard
                </button>
              </div>
            )}

            {/* username */}
            <div
              className={`relative p-4 ${
                theme === "dark" ? "bg-gray-800 " : "bg-white"
              } shadow-sm rounded-lg  `}
            >
              <label
                htmlFor="name"
                className="block text-sm font-serif font-medium text-gray-500 text-start"
              >
                Your Name
              </label>
              <div className="flex items-center">
                {isEditingName ? (
                  <input
                    type="text"
                    id="name"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-white text-black"
                    } `}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                ) : (
                  <span className="w-full font-serif font-medium px-3 py-2">
                    {user?.username || name}
                  </span>
                )}
                {isEditingName ? (
                  <>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => handleSave("name")}
                    >
                      <FaCheck className="h-5 w-5 text-green-500" />
                    </button>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => setShowNameEmoji(!showNameEmoji)}
                    >
                      <FaSmile className="h-5 w-5 text-yellow-500" />
                    </button>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => {
                        setIsEditingName(false);
                        setShowNameEmoji(false);
                      }}
                    >
                      <MdCancel className="h-5 w-5 text-gray-500" />
                    </button>
                  </>
                ) : (
                  <button
                    className="cursor-pointer ml-2 focus:outline-none"
                    onClick={() => setIsEditingName(!isEditingName)}
                  >
                    <FaPencilAlt className="h-5 w-5 text-gray-500" />
                  </button>
                )}
              </div>

              {showNameEmoji && (
                <div className="absolute z-10 -top-80">
                  <EmojiPicker
                    onEmojiClick={(emoji) => handleEmojiSelect(emoji, "name")}
                  />
                </div>
              )}
            </div>

            {/* about */}
            <div
              className={`relative p-4 ${
                theme === "dark" ? "bg-gray-800 " : "bg-white"
              } shadow-sm rounded-lg  `}
            >
              <label
                htmlFor="about"
                className="block text-sm font-serif font-medium text-gray-500 text-start"
              >
                About your self
              </label>
              <div className="flex items-center">
                {isEditingAbout ? (
                  <input
                    type="text"
                    id="about"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-white text-black"
                    } `}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                ) : (
                  <span className="w-full font-serif font-medium px-3 py-2">
                    {user?.about || about}
                  </span>
                )}
                {isEditingAbout ? (
                  <>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => handleSave("about")}
                    >
                      <FaCheck className="h-5 w-5 text-green-500" />
                    </button>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => setShowAboutEmoji(!showAboutEmoji)}
                    >
                      <FaSmile className="h-5 w-5 text-yellow-500" />
                    </button>
                    <button
                      className="cursor-pointer ml-2 focus:outline-none"
                      onClick={() => {
                        setIsEditingAbout(false);
                        setShowAboutEmoji(false);
                      }}
                    >
                      <MdCancel className="h-5 w-5 text-gray-500" />
                    </button>
                  </>
                ) : (
                  <button
                    className="cursor-pointer ml-2 focus:outline-none"
                    onClick={() => setIsEditingAbout(!isEditingAbout)}
                  >
                    <FaPencilAlt className="h-5 w-5 text-gray-500" />
                  </button>
                )}
              </div>

              {showAboutEmoji && (
                <div className="absolute z-10 -top-80">
                  <EmojiPicker
                    onEmojiClick={(emoji) => handleEmojiSelect(emoji, "about")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default UserDetails;
