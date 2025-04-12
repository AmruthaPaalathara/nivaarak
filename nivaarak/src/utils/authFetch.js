// src/utils/authFetch.js
import { refreshToken } from "./refreshToken";

export const authFetch = async (url, options = {}) => {
    let token = localStorage.getItem("accessToken");

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    let response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Try refreshing token
        const newToken = await refreshToken();

        if (newToken) {
            // Retry original request with new token
            const retryHeaders = {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
                "Content-Type": "application/json",
            };

            response = await fetch(url, {
                ...options,
                headers: retryHeaders,
            });
        } else {
            // Logout if refresh also fails
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userId");
            localStorage.removeItem("sessionId");
            window.location.href = "/login";
        }
    }

    return response;
};
