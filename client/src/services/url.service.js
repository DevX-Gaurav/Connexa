import axios from "axios";
import { BASE_URI } from "./apiPaths";

const getToken = () => localStorage.getItem("auth_token");
const axiosInstance = axios.create({
  baseURL: BASE_URI,
  timeout: 80000,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default axiosInstance;
