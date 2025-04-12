import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3001/api", // Ensure this matches your backend
});

// Axios Interceptor to Handle Token Expiry
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post("http://localhost:3001/api/auth/refresh-token", { refreshToken });
        localStorage.setItem("accessToken", res.data.accessToken);
        error.config.headers["Authorization"] = `Bearer ${res.data.accessToken}`;
        return API(error.config);
      } catch (refreshError) {
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
