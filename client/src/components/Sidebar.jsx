import React, { act, useEffect, useState } from "react";
import useLayoutStore from "../store/layoutStore";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import { FaCog, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";
import { motion } from "framer-motion";
import windowImg from "../assets/window.png";
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
        className={`${isMobile ? "" : "mt-10 mb-8"} ${
          activeTab === "chats" &&
          "object-cover focus:outline-none p-2 rounded-full"
        }`}
      >
        <img
          src={windowImg}
          alt=""
          className={`h-20  w-20  object-cover ${
            activeTab === "chats"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-800"
              : ""
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
        className={`${isMobile ? "" : "mb-4"} ${
          activeTab === "profile" && " focus:outline-none p-2 rounded-full"
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
          activeTab === "setting" && " focus:outline-none p-2 rounded-full"
        }`}
      >
        <FaCog
          className={`h-6 w-6 ${
            activeTab === "setting"
              ? theme === "dark"
                ? "text-gray-300"
                : "text-gray-800"
              : ""
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
      className={`border-r flex items-center py-4 shadow-lg ${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16 flex-row  justify-around"
          : "w-16 h-screen  flex-col justify-between"
      }
        ${
          theme === "dark"
            ? "bg-gray-800/90 border-gray-900"
            : "bg-[rgb(239,242,254)] border-gray-200"
        }
           
        `}
    >
      {" "}
      {SidebarContent}
    </motion.div>
  );
};

export default Sidebar;
