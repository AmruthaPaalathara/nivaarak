import axiosInstance from "./api";

export const archiveChatSession = async (sessionId, userId, documentId) => {
    if (!sessionId || !userId) return;

    try {
        await axiosInstance.post("/chat/archive", {
            sessionId,
            userId,
            documentId: documentId || null,
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        console.log("✅ Chat session archived.");
    } catch (err) {
        console.error("Error archiving chat session on logout:", err);
    }
};
