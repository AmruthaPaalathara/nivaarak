// frontend/src/services/verifyService.js
import API from "../utils/api";

export function checkApplication(id) {
    const token = localStorage.getItem("accessToken");
    return API.post(
        `/verifyDocument/applications/${id}/check`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    )
        .then(res => {
            console.log("🔍 checkApplication response:", res.data);
            // unwrap the nested `data` if your server wraps it
            return res.data.data ?? res.data;
        });
}

