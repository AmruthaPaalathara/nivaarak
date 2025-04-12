
import axios from "axios";

const fetchUserDocuments = async () => {
    try {
        const token = localStorage.getItem("accessToken"); // or sessionStorage if required
        if (!token) throw new Error("No authentication token found");

        const url = `${process.env.REACT_APP_API_URL}/api/certificates/user-documents`;
        console.log("🔗 Request URL:", url);

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
        console.error("Error fetching document types:", error.response?.data || error.message);
        return { success: false, types: [] };
    }
};

export default fetchUserDocuments;
