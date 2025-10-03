import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { motion } from "framer-motion";
import ChatList from "../pages/chatSection/ChatList";

import { getAllUsers } from "../services/user.service";
const Home = () => {
  const [allUsers, setAllUsers] = useState([]);
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

  console.log("allUsers", allUsers);

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
