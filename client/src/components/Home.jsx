import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { motion } from "framer-motion";
import ChatList from "../pages/chatSection/ChatList";
import { getAllUsers } from "../services/user.service";
import { getSocket } from "../services/chat.service";

const Home = () => {
  const [allUsers, setAllUsers] = useState([]);
  const socket = getSocket();
  const getAllUser = async () => {
    try {
      const result = await getAllUsers();
      if (result.status === "Success") {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error("error from home page", error);
    }
  };

  useEffect(() => {
    getAllUser();
  }, []);

  // handle incoming message
  const handleNewMessage = (message) => {
    setAllUsers((prev) =>
      prev.map((user) => {
        if (
          user._id === message.sender._id ||
          user._id === message.receiver._id
        ) {
          return {
            ...user,
            conversation: {
              ...user.conversation,
              lastMessage: message,
              unreadCount: {
                ...user.conversation?.unreadCount,
                [user._id]:
                  (user.conversation?.unreadCount?.[user._id] || 0) + 1,
              },
            },
          };
        }
        return user;
      })
    );
  };

  useEffect(() => {
    socket.on("receive_message", handleNewMessage);
    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  );
};

export default Home;
