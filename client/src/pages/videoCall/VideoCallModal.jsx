import React, { useEffect, useMemo, useRef } from "react";
import useVideoCallStore from "../../store/videoCallStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const VideoCallModal = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
    currentCall,
    incomingCall,
    isCallActive,
    callType,
    localStream,
    remoteStream,
    setCallActive,
    isVideoEnabled,
    isAudioEnabled,
    peerConnection,
    iceCandidateQueue,
    isCallModalOpen,
    callStatus,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
    addIceCandidate,
    processQueuedIceCandidates,
  } = useVideoCallStore();

  const { user } = useUserStore();
  const { theme } = useThemeStore();

  const rtcConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
      {
        urls: "stun:stun2.l.google.com:19302",
      },
    ],
  };
  /* memorize display the user info and it prevents the unnecessary re-render */
  const displayInfo = useMemo(() => {
    if (incomingCall && !isCallActive) {
      console.log("incomming call", incomingCall);

      return {
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
      };
    } else if (currentCall) {
      console.log("currentCall ", currentCall);
      return {
        name: currentCall.participantName,
        avatar: currentCall.participantAvatar,
      };
    }
    return null;
  }, [incomingCall, currentCall, isCallActive]);

  /* connection detection */

  useEffect(() => {
    if (peerConnection && remoteStream) {
      console.log("both peer connection and remote stream is available");
      setCallStatus("Connected");
      setCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallActive, setCallStatus]);

  /* set up local video stream when localstream change */
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  /* set up remote video stream when remote stream changes */
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* initialize media stream */
  const initializeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: true,
      });
      console.log("local media stream", stream.getTracks());
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Media error:", error);
    }
  };

  /* create peer connection */
  const createPeerConnection = (stream, role) => {
    const pc = new RTCPeerConnection(rtcConfiguration);

    /* add local tracks immediately */
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`${role} adding ${track.kind} track`, track.id.slice(0, 8));

        pc.addTrack(track, stream);
      });
    }

    /* handle ice candidates */
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const participantId =
          currentCall?.participantId || incomingCall?.callerId;
        const callId = currentCall?.callId || incomingCall?.callId;

        if (participantId && callId) {
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        }
      }
    };

    /* handle remote stream */
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`role: ${role}:connection state`, pc.connectionState);
      if (pc.connectionState === "failed") {
        setCallStatus("failed");
        setTimeout(handleEndCall, 3000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`${role}: ICE state`, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`${role}: Signaling state`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  /* caller :initialize call after acceptance */
  const initializeCaller = async () => {
    try {
      setCallStatus("connecting");

      /* get media */
      const stream = await initializeMedia(callType === "video");

      /* create peer connection with offer */
      const pc = createPeerConnection(stream, "CALLER");

      const offer = await pc.createOffer({
        offerToReceive: true,
        offerToReceiveVideo: callType === "video",
      });
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000);
      console.error("Error in initializerCaller", error);
    }
  };

  /* receiver :answer call */
  const handleAnswerCall = async () => {
    try {
      setCallStatus("connecting");

      /* get media */
      const stream = await initializeMedia(callType === "video");

      /* create peer connection with offer */
      createPeerConnection(stream, "RECEIVER");

      socket.emit("accept_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
        receiverInfo: {
          username: user?.username,
          avatar: user?.avatar,
        },
      });

      setCurrentCall({
        callId: incomingCall?.callId,
        participantId: incomingCall?.callerId,
        participantName: incomingCall?.callerName,
        participantAvatar: incomingCall?.callerAvatar,
      });

      clearIncomingCall();
    } catch (error) {
      handleEndCall();
      console.error("receiver error", error);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
      });
    }
    endCall();
  };

  const handleEndCall = () => {
    const participantId = currentCall?.participantId || incomingCall?.callerId;
    const callId = currentCall?.callId || incomingCall?.callId;
    if (participantId && callId) {
      socket.emit("end_call", {
        callId: callId,
        participantId: participantId,
      });
    }
    endCall();
  };

  /* socket event listner */
  useEffect(() => {
    if (!socket) return;

    /* call accepted start caller flow */
    /* { receiverName } */
    const handleCallAccepted = () => {
      if (currentCall) {
        setTimeout(() => {
          initializeCaller();
        }, 500);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(endCall, 2000);
    };

    const handleCallEnded = () => {
      endCall();
    };

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      if (!peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        /* process queues ice candidates */
        await processQueuedIceCandidates();
        /* create answer */
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });
        console.log("Receiver: Answer send waiting for ice candidates");
      } catch (error) {
        console.error("Receiver offer error", error);
      }
    };

    /* receiver answer to caller */
    const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
      if (!peerConnection) return;
      if (peerConnection.signalingState === "closed") {
        console.log("Caller : Peer connection is closed");
        return;
      }
      try {
        /* current caller signaling */
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        /* process queued the ice candidates */
        await processQueuedIceCandidates();

        /* check receiver */
        const receivers = peerConnection.getReceivers();
        console.log("Receiver", receivers);
      } catch (error) {
        console.error("Caller answer error in handlewebrtcanswer", error);
      }
    };

    /* receiver ice candidates */
    const handleWebRTCIceCandidates = async ({ candidate, senderId }) => {
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("ICE candidate added");
          } catch (error) {
            console.error("ICE candidate", error);
          }
        } else {
          console.log("queuing ice candidates");
          addIceCandidate(candidate);
        }
      }
    };

    /* register all events listeners */
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidates);

    console.log("Socket listners");
    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidates);
    };
  }, [socket, peerConnection, currentCall, incomingCall, user]);

  if (!isCallModalOpen && !incomingCall) return null;

  const shouldShowActiveCall =
    isCallActive || callStatus === "calling" || callStatus === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div
        className={`relative w-full h-full max-w-4xl rounded-lg overflow-hidden ${
          theme === "dark" ? "bg-gray-900" : "bg-white "
        }`}
      >
        {/* incoming call ui */}
        {incomingCall && !isCallActive && (
          <div className="flex flex-col justify-center items-center h-full p-8">
            <div className="text-center mb-8">
              <div className="w-32 h-32 object-cover rounded-full mx-auto mb-4 overflow-hidden bg-gray-300">
                <img
                  src={displayInfo?.avatar}
                  alt={displayInfo?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.src = "/placeholder.svg")}
                />
              </div>
              <h2
                className={`text-2xl font-semibold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900 "
                }`}
              >
                {displayInfo?.name}
              </h2>
              <p
                className={`text-lg ${
                  theme === "dark" ? "text-gray-300 " : "text-gray-600 "
                }`}
              >
                Icoming {callType} call...
              </p>
            </div>
            <div className="flex space-x-6">
              <button
                onClick={handleRejectCall}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
              <button
                onClick={handleAnswerCall}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FaVideo className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
        {/* active call ui */}
        {shouldShowActiveCall && (
          <div className="relative w-full h-full">
            {callType === "video" && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover bg-gray-800 ${
                  remoteStream ? "block" : "hidden"
                }`}
              />
            )}

            {/* avatar status display */}
            {(!remoteStream || callType !== "video") && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 object-cover rounded-full mx-auto mb-4 overflow-hidden bg-gray-600">
                    <img
                      src={displayInfo?.avatar}
                      alt={displayInfo?.name}
                      onError={(e) => (e.target.src = "/placeholder.svg")}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-white text-xl">
                    {callStatus === "calling"
                      ? `Calling ${displayInfo?.name || "User"}...`
                      : callStatus === "connecting"
                      ? "Connecting..."
                      : callStatus === "connected"
                      ? displayInfo?.name
                      : callStatus === "failed"
                      ? "Connection Failed"
                      : displayInfo?.name}
                  </p>
                </div>
              </div>
            )}

            {/* local video picture in picture */}
            {callType === "video" && localStream && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden object-cover border-2 border-white ">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* call status */}
            <div className="absolute top-4 left-4">
              <div
                className={`px-4 py-2 rounded-full ${
                  theme === "dark" ? "bg-gray-800/75" : "bg-white/75"
                }`}
              >
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {callStatus === "connected" ? "Connected" : callStatus}
                </p>
              </div>
            </div>

            {/* call controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-4">
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isVideoEnabled
                        ? "bg-gray-600 hover:bg-gray-700 text-white"
                        : "bg-red-500 hover:bg-red-700 text-white"
                    }  `}
                  >
                    {isVideoEnabled ? (
                      <FaVideo className="h-5 w-5" />
                    ) : (
                      <FaVideoSlash className="h-5 w-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={toggleAudio}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isAudioEnabled
                      ? "bg-gray-600 hover:bg-gray-700 text-white"
                      : "bg-red-500 hover:bg-red-700 text-white"
                  }  `}
                >
                  {isAudioEnabled ? (
                    <FaMicrophone className="h-5 w-5" />
                  ) : (
                    <FaMicrophoneSlash className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <FaPhoneSlash className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {callStatus === "calling" && (
          <button
            onClick={handleEndCall}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
