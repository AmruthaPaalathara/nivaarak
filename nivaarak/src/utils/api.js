

import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3001/api", // Match your backend base URL
    withCredentials: true,
});

// Attach access token for requests
API.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("accessToken")|| sessionStorage.getItem("accessToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
);

// Handle token expiration (401 errors)
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;  // Prevent infinite loops
        try {
            const refreshResponse  = await API.post("/auth/refresh-token", {}, { withCredentials: true });


            const newAccessToken = refreshResponse.data.accessToken;
          localStorage.setItem("accessToken", newAccessToken);

          // Retry original request with new token
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return API(originalRequest);
        } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          // Token refresh failed – redirect to login
            localStorage.removeItem("accessToken");
            sessionStorage.removeItem("accessToken");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
);

export default API;
