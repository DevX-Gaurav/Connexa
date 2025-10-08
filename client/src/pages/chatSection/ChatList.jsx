import React, { useState } from "react";
import useLayoutStore from "../../store/layoutStore";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import formatTimestamp from "../../utils/formatTime";

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const selectedContact = useLayoutStore((state) => state?.selectedContact);
  const { user } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  const [searchTerms, setSearchTerms] = useState("");

  const filteredContacts = contacts
    ?.filter((contact) =>
      contact?.username?.toLowerCase().includes(searchTerms.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.conversation?.lastMessage?.createdAt || 0) -
        new Date(a.conversation?.lastMessage?.createdAt || 0)
    );

  console.log("filtercontact :", filteredContacts);

  return (
    <div
      className={`w-100 flex-shrink-0 border-gray-300 border-r h-screen
    ${
      theme === "dark"
        ? "bg-[rgb(17,27,33)] border-gray-600"
        : "bg-white border-gray-200"
    }
    `}
    >
      <div
        className={`${
          theme === "dark" ? "text-white" : "text-gray-800"
        } p-4 flex justify-between`}
      >
        <h2 className="text-2xl font-normal font-serif ">Chats</h2>
      </div>
      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-800"
            } `}
          />

          <input
            type="text"
            placeholder="Search or start new chat"
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500  ${
              theme === "dark"
                ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500"
                : "bg-gray-100 text-black border-gray-200 placeholder-gray-400"
            }`}
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-120px)] ">
        {filteredContacts.map((contact) => (
          <motion.div
            key={contact?._id}
            onClick={() => setSelectedContact(contact)}
            className={`p-3 flex items-center cursor-pointer ${
              theme === "dark"
                ? selectedContact?._id === contact?._id
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
                : selectedContact?._id === contact?._id
                ? "bg-gray-200"
                : "hover:bg-gray-100"
            }`}
          >
            {/* Avatar */}
            <img
              src={contact?.avatar}
              alt={contact?.username}
              className="w-10 h-10 rounded-full object-cover"
            />

            {/* Middle Section */}
            <div className="ml-3 flex-1 min-w-0">
              <h2
                className={`font-semibold font-serif  capitalize truncate ${
                  theme === "dark" ? "text-white" : "text-black"
                }`}
              >
                {contact?.username}
              </h2>
              <p
                className={`text-sm text-ellipsis overflow-hidden whitespace-nowrap ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {contact?.conversation?.lastMessage?.content}
              </p>
            </div>

            {/* Right Section (time + unread) */}
            <div className="ml-2 flex flex-col items-end justify-between">
              {contact?.conversation?.lastMessage?.createdAt && (
                <span
                  className={`text-xs mb-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {formatTimestamp(
                    contact?.conversation?.lastMessage?.createdAt
                  )}
                </span>
              )}
              {contact?.conversation?.unreadCount?.[user?._id] > 0 && (
                <span
                  className={`text-sm font-semibold h-6 w-6 flex items-center justify-center rounded-full ${
                    theme === "dark"
                      ? "bg-green-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {contact?.conversation?.unreadCount?.[user?._id]}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
