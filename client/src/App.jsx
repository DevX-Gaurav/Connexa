import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useUserStore from "./store/useUserStore";
import { disconnectSocket, initializeSocket } from "./services/chat.service";
import { useChatStore } from "./store/chatStore";

const App = () => {
  const user = useUserStore();
  console.log('user from app', user);
  
  const { setCurrentUser, initSocketListener, cleanUp } = useChatStore();

  useEffect(() => {
    if (user?._id) {
      setCurrentUser(user); 
      const socket = initializeSocket();

      if (socket) {
        
        initSocketListener();
      }
    }
    return () => {
      cleanUp();
      disconnectSocket();
    };
  }, [user, setCurrentUser, initSocketListener, cleanUp]);

  return (
    <>
      <Outlet />
      <Toaster reverseOrder={false} />
    </>
  );
};

export default App;
