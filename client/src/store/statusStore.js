import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";
import { API_PATHS } from "../services/apiPaths";
const useStatusStore = create((set, get) => ({
  /* states */
  statuses: [],
  loading: false,
  error: null,

  /* active */
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /* initialize the socket listener */
  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    /* real time status events */
    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });

    /* real time status delete */
    socket.on("status_deleted", (statusId) => {
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    });

    /* status viewed */
    socket.on("status_viewed", (statusId, viewers) => {
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status, viewers } : status
        ),
      }));
    });
  },

  cleanUpSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
    }
  },

  /* fetching statuses */
  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { response } = await axiosInstance.get(API_PATHS.STATUS.GET_STATUS);
      set({ statuses: response?.data || [], loading: false });
    } catch (error) {
      console.error("Error in fetching status", error);
      set({ error: error?.message, loading: false });
    }
  },

  /* creating statuses */
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) {
        formData.append("media", statusData.file);
      }
      if (statusData.content?.trim()) {
        formData.append("content", statusData?.content);
      }
      const { response } = await axiosInstance.post(
        API_PATHS.STATUS.CREATE_STATUS,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      /* add to status in local state */
      if (response?.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === response?.data._id)
            ? state.statuses
            : [response?.data, ...state.statuses],
        }));
      }
      set({ loading: false });
      return response?.data;
    } catch (error) {
      console.error("Error in creating status", error);
      set({ error: error.message, loading: false });
    }
  },

  /* view status */
  viewStatus: async (statusId) => {
    try {
      set({ loading: true, error: false });
      await axiosInstance.put(API_PATHS.STATUS.VIEW_STATUS(statusId));
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status } : status
        ),
      }));
      set({ loading: false });
    } catch (error) {
      console.error("Error in viewing the  status", error);
      set({ error: error.message, loading: false });
    }
  },

  /* delete status */
  deleteStatus: async (statusId) => {
    try {
      set({ loading: true, error: false });
      await axiosInstance.delete(API_PATHS.STATUS.DELETE_STATUS(statusId));
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
      set({ loading: false });
    } catch (error) {
      console.error("Error in deleting the  status", error);
      set({ error: error.message, loading: false });
    }
  },

  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: false });
      const { response } = await axiosInstance.get(
        API_PATHS.STATUS.GET_STATUS_VIEWERS(statusId)
      );
      return response.data;
      set({ loading: false });
    } catch (error) {
      console.error("Error in getting the  status", error);
      set({ error: error.message, loading: false });
    }
  },

  /* helper function for grouped status */
  getGroupedStatus: () => {
    const { statuses } = get();
    return statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id;
      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status?.user?.username,
          avatar: status?.user?.avatar,
          statuses: [],
        };
      }
      acc[statusUserId].statuses.push({
        id: status._id,
        media: status.content,
        contentType: status.contentType,
        timestamp: status.createdAt,
        viewers: status.viewers,
      });
      return acc;
    }, {});
  },

  getUserStatus: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return userId ? groupedStatus[userId] : null;
  },
  getOtherStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },
  /* clear error */
  clearError: () => {
    set({ error: null });
  },
  reset: () => {
    set({
      statuses: [],
      loading: false,
      error: null,
    });
  },
}));

export default useStatusStore;
