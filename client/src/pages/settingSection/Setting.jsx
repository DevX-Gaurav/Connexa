import React, { useState } from "react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { logout } from "../../services/user.service";
import Layout from "../../components/Layout";
import {
  FaComment,
  FaMoon,
  FaQuestionCircle,
  FaSearch,
  FaSignInAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const Setting = () => {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const { theme } = useThemeStore();
  const { user, clearUser } = useUserStore();
  const toggleThemeDialog = () => {
    setIsThemeDialogOpen(!isThemeDialogOpen);
  };
  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      toast.success("Logout successfully");
    } catch (error) {
      console.error("failed to logout", error);
      toast.error("failed to logout");
    }
  };

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div
        className={`flex h-screen ${
          theme === "dark"
            ? "bg-[rgb(17,23,33)] text-white"
            : "bg-white text-black"
        }`}
      >
        <div
          className={`w-[400px] border-r ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          } `}
        >
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-4">Settings</h1>
            <div className="relative  mb-4">
              <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search settings"
                className={`w-full ${
                  theme === "dark"
                    ? "bg-[#202c33] text-white"
                    : "bg-gray-100 text-black"
                } border-none pl-10 placeholder-gray-400 rounded-full p-2`}
              />
            </div>

            <div
              className={` items-center gap-4 p-3 ${
                theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
              } rounded-lg cursor-pointer mb-4`}
            >
              <img
                src={user?.avatar}
                alt="profile"
                className="w-20 h-20 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold">{user?.username}</h2>
                <p className="text-sm text-gray-400">{user?.about} </p>
              </div>
            </div>

            {/* menu items */}
            <div className="h-[calc(100vh-280px)]  overflow-y-auto">
              <div className="space-y-1">
                {[
                  { icon: FaUser, label: "Account", href: "/user-profile" },
                  { icon: FaComment, label: "Chats", href: "/" },
                  { icon: FaQuestionCircle, label: "Help", href: "/help" },
                ].map((item) => (
                  <Link
                    to={item.href}
                    key={item.label}
                    className={`w-full flex items-center gap-3 px-2 rounded ${
                      theme === "dark"
                        ? "text-white hover:bg-[#202c33]"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <div
                      className={` ${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      } w-full p-4`}
                    >
                      {item.label}
                    </div>
                  </Link>
                ))}

                {/* theme button */}
                <button
                  onClick={toggleThemeDialog}
                  className={`w-full cursor-pointer p-2 flex items-center gap-3  rounded ${
                    theme === "dark"
                      ? "text-white hover:bg-[#202c33]"
                      : "text-black hover:bg-gray-100"
                  }`}
                >
                  {theme === "dark" ? (
                    <FaMoon className="h-5 w-5" />
                  ) : (
                    <FaSun className="h-5 w-5" />
                  )}
                  <div
                    className={`flex flex-col gap-3 px-2 text-start  ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    } w-full `}
                  >
                    Theme
                    <span
                      className={`justify-center text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-900"
                      } `}
                    >
                      ( {theme.charAt(0).toUpperCase() + theme.slice(1)} )
                    </span>
                  </div>
                </button>
              </div>
              <button
                onClick={handleLogout}
                className={`w-full flex mt-10  items-center gap-3 p-2 rounded text-red-500 ${
                  theme === "dark"
                    ? " font-semibold hover:bg-[#202c33]"
                    : "font-semibold hover:bg-gray-100"
                }`}
              >
                <FaSignInAlt className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Setting;
