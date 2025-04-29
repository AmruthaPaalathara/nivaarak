
import axios from "axios";

const fetchUserDocuments = async () => {
    try {
        const token = localStorage.getItem("accessToken"); // or sessionStorage if required
        if (!token) throw new Error("No authentication token found");

        const url = `${process.env.REACT_APP_API_URL}/certificates/user-documents`;
        console.log(" Request URL:", url);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Fetched docs:", response.data);

        // Return unique document types (in case duplicates exist)
        const types = [...new Set(response.data.documentTypes || [])];
        return { success: true, types };

    } catch (error) {
        if (error.response?.status === 401) {
            // Token expired or unauthorized, attempt to refresh
            const refreshToken = document.cookie.split(';').find(cookie => cookie.trim().startsWith('refreshToken='));

            if (refreshToken) {
                try {
                    // Send the refresh token to the backend to get a new access token
                    const refreshResponse = await axios.post(`${process.env.REACT_APP_API_URL}/auth/refresh-token`, {}, {
                        headers: {
                            "Authorization": `Bearer ${refreshToken.split('=')[1]}`
                        },
                        withCredentials: true // Make sure to send cookies
                    });

                    // Store the new access token
                    const newAccessToken = refreshResponse.data.accessToken;
                    localStorage.setItem("accessToken", newAccessToken);

                    // Retry the original request with the new token
                    const retryResponse = await axios.get(url, {
                        headers: {
                            Authorization: `Bearer ${newAccessToken}`
                        }
                    });

                    console.log("Fetched docs after token refresh:", retryResponse.data);

                    const types = [...new Set(retryResponse.data.documentTypes || [])];
                    return { success: true, types };

                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError.response?.data || refreshError.message);
                    return { success: false, types: [] };
                }
            } else {
                console.error("No refresh token found in cookies");
                return { success: false, types: [] };
            }
        } else {
            console.error("Error fetching document types:", error.response?.data || error.message);
            return { success: false, types: [] };
        }
    }
};

export default fetchUserDocuments;
