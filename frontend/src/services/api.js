// services/api.js
//
// Single Axios instance for the whole app. The auth token is attached
// automatically to every request via an interceptor, so individual
// components never need to manually add headers.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("grampulse_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
