const handleVideoCallEvent = (socket, io, onlineUsers) => {
  /* initiate call */
  socket.on(
    "initiate_call",
    ({ callerId, receiverId, callType, callerInfo }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;
        io.to(receiverSocketId).emit("incoming_call", {
          callerId,
          callerName: callerInfo.username,
          callerAvatar: callerInfo.avatar,
          callId,
          callType,
        });
      } else {
        console.log(`Server: Receiver ${receiverId} is offline`);
        socket.emit("call_failed", { reason: "User is offline" });
      }
    }
  );

  /* accept call */
  socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_accepted", {
        callerName: receiverInfo.username,
        callerAvatar: receiverInfo.avatar,
        callId,
      });
    } else {
      console.log(`Server: Caller ${callerId} is offline`);
    }
  });

  /* reject call */
  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_rejected", { callId });
    }
  });

  /* end call */
  socket.on("end_call", ({ callId, participantId }) => {
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      io.to(participantSocketId).emit("call_ended", { callId });
    }
  });

  /* webrtc signalling event with proper userID*/
  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`server offer forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found the offer`);
    }
  });

  /* webrtc signalling event with proper userID*/
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        senderId: socket.userId,
        callId,
      });
      console.log(`server answer forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found the answer`);
    }
  });

  /* webrtc signalling event with proper userID*/
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    console.log('connecting ice candidate');
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_ice_candidate", {
        candidate,
        senderId: socket.userId,
        callId,
      });
    } else {
      console.log(`server: Receiver ${receiverId} not found the ICE candidate`);
    }
  });
};

export default handleVideoCallEvent;
