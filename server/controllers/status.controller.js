import response from "../utils/responseHandler.js";
import Status from "../models/status.model.js";
import Message from "../models/message.model.js";
import { uploadToCloudinary } from "../Config/cloudinary.js";

const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";
    /* handle file upload */
    if (file) {
      const uploadFile = await uploadToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }
      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "unsupported file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });

    await status.save();
    const populatedStatus = await Status.findOne(status?._id)
      .populate("user", "username avatar")
      .populate("viewers", "username avatar");

    /* emit socket event */
    if (req.io && req.socketUserMap) {
      /* broadcast to all the connecting users except the user itself. */
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 201, "status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* get status */
const getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username avatar")
      .populate("viewers", "username avatar")
      .sort({ createdAt: -1 });

    return response(res, 200, "status fetched successfully", statuses);
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

/* view user */
const viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user;
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username avatar")
        .populate("viewers", "username avatar");

      /* emit socket event */
      if (req.io && req.socketUserMap) {
        /* broadcast to all the connecting users except the user itself. */
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString()
        );
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };
          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else console.log("status owner not connected");
      }
    } else {
      console.log("user viewed the status already");
    }

    return response(res, 200, "status viewed  successfully");
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user;
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete the status");
    }
    await status.deleteOne();

    /* emit socket event */
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "status deleted successfully");
  } catch (error) {
    console.error("Error: ", error);
    return response(res, 500, "Internal server error");
  }
};

export { createStatus, getStatus, viewStatus, deleteStatus };
