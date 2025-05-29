export const refreshToken = async () => {
    try {
        const response = await fetch("http://localhost:3001/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        const data = await response.json();

        if (response.ok && data.accessToken) {
            localStorage.setItem("accessToken", data.accessToken);
            return data.accessToken;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Refresh token error:", error);
        return null;
    }
};
