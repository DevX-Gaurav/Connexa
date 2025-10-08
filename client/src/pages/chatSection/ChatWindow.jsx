import React, { useEffect, useRef, useState } from "react";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import { useChatStore } from "../../store/chatStore";
import {
  isToday,
  isYesterday,
  format,
  differenceInCalendarDays,
} from "date-fns";
import windowImage from "../../assets/window.png";
import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaLock,
  FaPaperclip,
  FaPaperPlane,
  FaSmile,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "emoji-picker-react";
import VideoCallManager from "../videoCall/VideoCallManager";
import { getSocket } from "../../services/chat.service";
import useVideoCallStore from "../../store/videoCallStore";

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const socket = getSocket();

  const {
    conversations,
    currenctConversation,
    messages,
    loading,
    fetchConversation,
    fetchMessage,
    sendMessage,
    recieveMessage,
    markMessagesAsRead,
    deletedMessage,
    addReactions,
    startTyping,
    stopTyping,
    isUserTyping,
    isUserOnline,
    getUserLastSeen,
    cleanUp,
  } = useChatStore();

  /* get online status and lastseen */
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const currentConv = conversations?.data?.find((conv) =>
        conv.participants.some(
          (participant) => participant._id === selectedContact?._id
        )
      );
      if (currentConv?._id) {
        fetchMessage(currentConv._id);
      }
    }
  }, [selectedContact, conversations]);

  useEffect(() => {
    fetchConversation();
  }, []);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "auto" }); /* behavior */
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact?._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 3000);
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) return;
    setFilePreview(null);
    try {
      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);
      const status = online ? "delivered" : "send";
      formData.append("messageStatus", status);
      if (message.trim()) {
        formData.append("content", message.trim());
      }
      /* if there is no file included */
      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }
      if (!message.trim() && !selectedFile) return;
      await sendMessage(formData);

      /* clear state */
      setMessage("");
      setFilePreview(null);
      setSelectedFile(null);
      setShowFileMenu(false);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const renderDateSeparator = (date) => {
    if (!isValidate(date)) return null;
    let dateString;
    const today = new Date();
    const diff = differenceInCalendarDays(today, date);

    if (isToday(date)) dateString = "Today";
    else if (isYesterday(date)) dateString = "Yesterday";
    else if (diff < 7) dateString = format(date, "EEEE");
    else dateString = format(date, "dd/MM/yyyy");
    /*   else dateString = format(date, "EEEE, MMMM dd"); */

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300 "
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  /* grouping message  */
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, message) => {
        if (!message.createdAt) return acc;
        const date = new Date(message.createdAt);
        if (isValidate(date)) {
          const dateString = format(date, "yyyy-MM-dd");
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(message);
        } else {
          console.error("Invalid date for message", error);
        }
        return acc;
      }, {})
    : {};

  const handleReaction = (messageId, emoji, currentUser) => {
    addReactions(messageId, emoji, currentUser);
  };

  const handleVideoCall = () => {
    if (selectedContact && online) {
      const { initiateCall } =
        useVideoCallStore.getState(); /* videoCallManager */

      const avatar = selectedContact?.avatar;
      initiateCall(
        selectedContact?._id,
        selectedContact?._username,
        avatar,
        "video"
      );
    } else {
      alert("User is offline");
    }
  };

  if (!selectedContact) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center mx-auto h-screen text-center ">
        <div className="max-w-md">
          <img
            src={windowImage}
            alt="whatsapp image"
            className="w-full h-auto"
          />
          <h2
            className={`  ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Select a conversation to start chatting.
          </h2>
          <p
            className={` ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Choose a contact from the list on the left side to begin messaging
          </p>
          <p
            className={` flex items-center text-sm justify-center gap-x-2   ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <FaLock className="h-4 w-4" />
            Your personal messages are end-to-end encrypted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 h-screen w-full flex flex-col overflow-x-hidden">
        <div
          className={`py-4  px-2 flex items-center ${
            theme === "dark"
              ? "bg-[#303430] text-white"
              : "bg-[rgb(239,242,245)] text-gray-600"
          }`}
        >
          <button
            className="mr-4 cursor-pointer focus:outline-none"
            onClick={() => setSelectedContact(null)}
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <img
            src={selectedContact?.avatar}
            alt={selectedContact?.username}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div className="ml-3 flex-grow">
            <h2 className="font-semibold font-serif  text-start">
              {selectedContact?.username}
            </h2>

            {isTyping ? (
              <div className="">Typing...</div>
            ) : (
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {online
                  ? "Online"
                  : lastSeen
                  ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                  : "Offline"}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4 mx-4">
            <button
              className="focus:outline-none cursor-pointer"
              title={online ? "Start video Call" : "User is offline"}
              onClick={handleVideoCall}
            >
              <FaVideo className="h-10 w-10 text-green-500 hover:text-white rounded-full gap-2 px-2 hover:bg-green-600 " />
            </button>
            
          </div>
        </div>

        <div
          className={` flex-1  p-4 overflow-y-auto ${
            theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
          }`}
        >
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <React.Fragment key={date}>
              {renderDateSeparator(new Date(date))}
              {msgs
                .filter(
                  (msg) =>
                    msg.conversations === selectedContact?.conversations?._id
                )
                .map((msg) => (
                  <MessageBubble
                    key={msg._id || msg.tempId}
                    message={msg}
                    theme={theme}
                    currentUser={user}
                    onReact={handleReaction}
                    deletedMessage={deletedMessage}
                    receiver={selectedContact}
                  />
                ))}
            </React.Fragment>
          ))}
          <div ref={messageEndRef} />
        </div>
        {filePreview && (
          <div className="relative p-2">
            {selectedFile?.type.startsWith("video/") ? (
              <video
                src={filePreview}
                controls
                className="w-80 object-cover rounded shadow-lg mx-auto"
              />
            ) : (
              <img
                src={filePreview}
                alt="file-preview"
                className="w-80 object-cover rounded shadow-lg mx-auto"
              />
            )}

            <button className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={`p-4 ${
            theme === "dark" ? "bg-[#303430]" : "bg-white"
          } flex items-center space-x-2 relative`}
        >
          <button
            className="focus:outline-none cursor-pointer"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile
              className={`h-6 w-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500 "
              }`}
            />
          </button>
          {showEmojiPicker && (
            <div
              className="absolute left-0 bottom-16 z-50"
              ref={emojiPickerRef}
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setMessage((prev) => prev + emojiObject.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={theme}
              />
            </div>
          )}

          <div className="relative px-2">
            <button
              className="focus:outline-none cursor-pointer"
              onClick={() => setShowFileMenu(!showFileMenu)}
            >
              <FaPaperclip
                className={`h-5 w-5 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                } mt-2`}
              />
            </button>
            {showFileMenu && (
              <div
                className={`absolute rounded-lg shadow-lg bottom-full left-0 mb-2 ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*" /* ,pdf/* */
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex hover:rounded-md cursor-pointer items-center px-4 py-2 w-full transition-colors  ${
                    theme === "dark" ? "hover:bg-gray-500" : "hover:bg-gray-200"
                  }`}
                >
                  <FaImage className="mr-2" /> Image
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex hover:rounded-md cursor-pointer  items-center px-4 py-2 w-full transition-colors  ${
                    theme === "dark" ? "hover:bg-gray-500" : "hover:bg-gray-200"
                  }`}
                >
                  <FaVideo className="mr-2" /> Video
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            className={`flex flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-700 text-white border-gray-600"
                : "bg-white text-black border-gray-300"
            }`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message"
          />
          <button
            className="focus:outline-none cursor-pointer"
            onClick={handleSendMessage}
          >
            <FaPaperPlane className="h-5 w-5 text-green-500" />
          </button>
        </div>
      </div>

      <VideoCallManager socket={socket} />
    </>
  );
};

export default ChatWindow;
