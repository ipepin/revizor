import axios from "axios";
import { expireSession } from "../auth/session";
import { API_ORIGIN } from "./base";

export const API = API_ORIGIN;

const api = axios.create({
  baseURL: API_ORIGIN || undefined,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("revize_jwt");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      expireSession();
    }
    return Promise.reject(err);
  }
);

export default api;
