// src/api/documentService.js

import axios from "axios";

// 1) Create a shared Axios instance that sends cookies
const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    withCredentials: true,                // ← send HTTP-only cookies
    headers: { "Content-Type": "application/json" }
});

/**
 * Fetches this user’s document types.
 * Automatically handles access-token expiry by calling /auth/refresh-token (cookie-based).
 *
 * @returns {Promise<{success: boolean, types: string[]}>}
 */
export async function fetchUserDocuments() {
    const url = "/certificates/user-documents";

    try {
        // 1a) Get current access token
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
            throw new Error("No access token, please log in.");
        }

        // 1b) Attempt to fetch document types
        const response = await API.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const types = [...new Set(response.data.documentTypes || [])];
        return { success: true, types };

    } catch (error) {
        // 2) If we got a 401, try to refresh the token
        if (error.response?.status === 401) {
            console.warn("Access token expired; attempting refresh...");

            try {
                // 2a) Hit your refresh endpoint; browser will send the refreshToken cookie
                const refreshResp = await API.post("/auth/refresh-token");
                const newAccess = refreshResp.data.accessToken;
                localStorage.setItem("accessToken", newAccess);

                // 2b) Retry original request with new token
                const retry = await API.get(url, {
                    headers: { Authorization: `Bearer ${newAccess}` }
                });
                const types = [...new Set(retry.data.documentTypes || [])];
                return { success: true, types };

            } catch (refreshError) {
                console.error(
                    "Token refresh failed:",
                    refreshError.response?.data || refreshError.message
                );
                return { success: false, types: [] };
            }
        }

        // 3) Any other error
        console.error(
            "Error fetching document types:",
            error.response?.data || error.message
        );
        return { success: false, types: [] };
    }
}


