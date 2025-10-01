import axios from "axios";
import { BASE_URI } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URI,
  timeout: 80000,
  withCredentials: true,
});

export default axiosInstance;
