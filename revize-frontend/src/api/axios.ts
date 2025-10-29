// src/api/axios.ts
import axios from "axios";
import { API_ORIGIN } from "./base";

export const API = API_ORIGIN;

const api = axios.create({
  baseURL: API_ORIGIN || undefined,
});

// Každý request -> přidej JWT z localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("revize_jwt");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// (volitelné) Globální reakce na 401/403
// api.interceptors.response.use(undefined, (err) => {
//   if (err?.response?.status === 401 || err?.response?.status === 403) {
//     localStorage.removeItem("revize_jwt");
//     window.location.href = "/login";
//   }
//   return Promise.reject(err);
// });

export default api;
