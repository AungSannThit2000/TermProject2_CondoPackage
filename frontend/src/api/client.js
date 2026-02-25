/**
 * Shared API client.
 * Adds auth tokens automatically and performs a global logout when the backend rejects a session.
 */

import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
});

// Automatically attach token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global auth guard: logout on unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      if (window.location.pathname !== "/login") {
        alert("Your session expired. Please log in again.");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
