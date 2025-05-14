// frontend/src/services/verifyService.js
import API from "../utils/api";

export function checkApplication(id) {
    return API.post(`/verify/applications/${id}/check`).then(res => res.data);
}
