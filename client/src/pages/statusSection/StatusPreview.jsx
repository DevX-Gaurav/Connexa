import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import formatTimestamp from "../../utils/formatTime";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaPlay,
  FaTrash,
  FaEye,
  FaChevronDown,
} from "react-icons/fa";

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  theme,
  currentUser,
  loading,
}) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const currentStatus = contact?.statuses[currentIndex];
  const isOwner = contact?.id === currentUser?._id;
  const intervalRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);
    if (!currentStatus) return;

    let current = 0;
    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        current += 2;
        setProgress(current);
        if (current >= 100) {
          clearInterval(intervalRef.current);
          onNext();
        }
      }
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [currentIndex, isPaused]);


  const handlePauseToggle = () => {
    setIsPaused((prev) => {
      const newPaused = !prev;
      if (videoRef.current) {
        if (newPaused) videoRef.current.pause();
        else videoRef.current.play();
      }
      return newPaused;
    });
  };

  const handleDeleteStatus = () => {
    if (onDelete && currentStatus?.id) onDelete(currentStatus.id);
  };

  const handleViewersToggle = () => {
    setShowViewers((prev) => !prev);
  };

  if (!currentStatus) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-full h-full bg-black/90 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-4xl flex justify-center items-center mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top progress bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-center p-4 z-10 gap-1">
          {contact?.statuses.map((_, index) => (
            <div
              key={index}
              className="h-1 bg-gray-400/50 flex-1 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              ></div>
            </div>
          ))}
        </div>
        {/* Header */}
        <div className="absolute top-8 left-4 right-16 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={contact?.avatar}
              alt={contact?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div>
              <p className="text-white font-semibold">{contact?.name}</p>
              <p className="text-gray-300 text-sm">
                {formatTimestamp(currentStatus.timestamps)}
              </p>
            </div>
          </div>

          {/* pause and delete */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePauseToggle}
              className="text-white bg-gray-700/60 rounded-full p-2 hover:bg-gray-700 transition-all"
            >
              {isPaused ? (
                <FaPlay className="h-4 w-4" />
              ) : (
                <FaPause className="h-4 w-4" />
              )}
            </button>

            {isOwner && (
              <button
                onClick={handleDeleteStatus}
                className="text-white bg-red-500/70 rounded-full p-2 hover:bg-red-500/90 transition-all"
              >
                <FaTrash className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {/* Main Status Content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStatus?.contentType?.startsWith("video") ? (
            <video
              ref={videoRef}
              src={currentStatus.media}
              className="max-h-[90%] max-w-[90%] rounded-lg"
              autoPlay
              controls
              muted
              playsInline
            />
          ) : currentStatus?.contentType?.startsWith("image") ? (
            <img
              src={currentStatus.media}
              alt="status"
              className="max-h-[90%] max-w-[90%] object-contain rounded-lg"
            />
          ) : (
            <p className="text-white text-2xl text-center px-8">
              {currentStatus.media}
            </p>
          )}
        </div>
        {/* Viewer Section */}
        {isOwner && (
          <div className="absolute bottom-6 left-4 right-4">
            <button
              onClick={handleViewersToggle}
              className="flex items-center justify-between w-full text-white bg-black/40 rounded-lg px-4 py-2 hover:bg-black/60 transition-all"
            >
              <div className="flex items-center space-x-2">
                <FaEye className="w-4 h-4" />
                <span>{currentStatus?.viewers?.length || 0}</span>
              </div>
              <FaChevronDown
                className={`h-4 w-4 transition-transform ${
                  showViewers ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showViewers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 bg-black/60 rounded-lg p-4 max-h-40 overflow-y-auto"
                >
                  {loading ? (
                    <p className="text-center text-white">Loading viewers...</p>
                  ) : currentStatus?.viewers?.length > 0 ? (
                    <div className="space-y-2">
                      {currentStatus.viewers.map((viewer) => (
                        <div
                          key={viewer?._id}
                          className="flex items-center space-x-3"
                        >
                          <img
                            src={viewer.avatar}
                            alt={viewer.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-white">{viewer.username}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white text-center">No viewers yet</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Navigation Controls */}{" "}
        {currentIndex > 0 && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-2xl"
            onClick={onPrev}
          >
            <FaChevronLeft />
          </button>
        )}
        {currentIndex < contact.statuses.length - 1 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-2xl"
            onClick={onNext}
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default StatusPreview;
