// import axios from "axios";
//
// const API = axios.create({
//   baseURL: "http://localhost:3001/api", // Ensure this matches your backend
// });
//
// // Axios Interceptor to Handle Token Expiry
// API.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       const refreshToken = localStorage.getItem("refreshToken");
//       if (!refreshToken) {
//         window.location.href = "/login";
//         return Promise.reject(error);
//       }
//
//       try {
//         const res = await axios.post("http://localhost:3001/api/auth/refresh-token", { refreshToken });
//         localStorage.setItem("accessToken", res.data.accessToken);
//         error.config.headers["Authorization"] = `Bearer ${res.data.accessToken}`;
//         return API(error.config);
//       } catch (refreshError) {
//         window.location.href = "/login";
//         return Promise.reject(refreshError);
//       }
//     }
//     return Promise.reject(error);
//   }
// );
//
// export default API;


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
          const refreshResponse  = await API.post(
              "/auth/refresh-token",
              {},
              { withCredentials: true }  //  Important to send cookies!
          );

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
