import React, { act, useEffect, useState } from "react";
import useLayoutStore from "../store/layoutStore";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import { FaCog, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";
import { motion } from "framer-motion";

const Sidebar = () => {
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();
  const { user } = useUserStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname === "status") {
      setActiveTab("status");
    } else if (location.pathname === "/user-profile") {
      setActiveTab("profile");
    } else if (location.pathname === "/setting") {
      setActiveTab("setting");
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null;
  }

  const SidebarContent = (
    <>
      {/* to home route */}
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "chats" &&
          "bg-gray-300 shadow-sm focus:outline-none p-2 rounded-full"
        }`}
      >
        <FaWhatsapp
          className={`h-6 w-6 ${
            activeTab === "chats"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800"
          }`}
        />
      </Link>

      {/* status */}
      <Link
        to="/status"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "status" &&
          "bg-gray-300 shadow-sm focus:outline-none p-2 rounded-full"
        }`}
      >
        <MdRadioButtonChecked
          className={`h-6 w-6 ${
            activeTab === "status"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800"
          }`}
        />
      </Link>
      {!isMobile && <div className="flex-grow" />}

      {/* avatar logo */}
      <Link
        to="/user-profile"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "profile" &&
          "bg-gray-300 shadow-sm focus:outline-none p-2 rounded-full"
        }`}
      >
        {user?.avatar ? (
          <img
            src={user?.avatar}
            alt="userAvatar"
            className="h-10 w-10 rounded-full border object-cover border-gray-500 "
          />
        ) : (
          <FaUserCircle
            className={`h-6 w-6 border border-gray-100 ${
              activeTab === "profile"
                ? theme === "dark"
                  ? "text-gray-800"
                  : ""
                : theme === "dark"
                ? "text-gray-300"
                : "text-gray-800"
            }`}
          />
        )}
      </Link>

      {/* settings */}
      <Link
        to="/setting"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "setting" &&
          "bg-gray-300 shadow-sm focus:outline-none p-2 rounded-full"
        }`}
      >
        <FaCog
          className={`h-6 w-6 ${
            activeTab === "setting"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800"
          }`}
        />
      </Link>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16 flex-row justify-around"
          : "w-16 h-screen border-r-2 flex-col justify-between"
      }
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-600"
            : "bg-[rgb(239, 242 254)] border-gray-300"
        }
         bg-opacity-90 flex items-center py-4 shadow-lg
        `}
    >
      {" "}
      {SidebarContent}
    </motion.div>
  );
};

export default Sidebar;
