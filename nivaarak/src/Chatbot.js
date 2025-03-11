import React, { useState } from "react";
import axios from "axios";

const Chatbot = () => {
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("general"); //  Select mode (General Chat / Ask Document)

    //  Handle Chat or Document-based Queries
    const sendMessage = async () => {
        if (!message.trim()) return;

        const newChat = [...chat, { sender: "user", text: message }];
        setChat(newChat);

        try {
            let response;
            if (mode === "general") {
                response = await axios.post("http://localhost:3001/chat", { message });
            } else {
                response = await axios.post("http://localhost:3001/ask-document", { question: message });
            }

            setChat([...newChat, { sender: "bot", text: response.data.response }]);
        } catch (error) {
            console.error("Axios Error:", error);
            setChat([...newChat, { sender: "bot", text: "Error: Could not connect to the server." }]);
        }

        setMessage("");
    };

    //  Handle PDF Upload
    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        const formData = new FormData();
        formData.append("pdf", uploadedFile);

        try {
            const response = await axios.post("http://localhost:3001/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            alert(response.data.message);
        } catch (error) {
            console.error("File Upload Error:", error);
        }
    };

    return (
        <div style={styles.container}>
            <h2> AI Chatbot</h2>

            {/*  PDF Upload */}
            <input type="file" onChange={handleFileUpload} accept="application/pdf" style={styles.fileInput} />

            {/*  Chat Box */}
            <div style={styles.chatbox}>
                {chat.map((msg, index) => (
                    <div key={index} style={msg.sender === "user" ? styles.userMessage : styles.botMessage}>
                        {msg.text}
                    </div>
                ))}
            </div>

            {/*  Chat Input with Dropdown for Mode Selection */}
            <div style={styles.inputContainer}>
                <select value={mode} onChange={(e) => setMode(e.target.value)} style={styles.select}>
                    <option value="general"> General Chat</option>
                    <option value="document"> Ask Document</option>
                </select>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your question..." style={styles.input} />
                <button onClick={sendMessage} style={styles.button}>Send</button>
            </div>
        </div>
    );
};

//  Updated Styles
const styles = {
    container: { maxWidth: "600px", margin: "auto", padding: "20px", textAlign: "center", backgroundColor: "#f9f9f9", borderRadius: "10px" },
    chatbox: { border: "1px solid #ddd", padding: "10px", height: "300px", overflowY: "scroll", backgroundColor: "#fff" },
    userMessage: { textAlign: "right", color: "blue", margin: "5px" },
    botMessage: { textAlign: "left", color: "green", margin: "5px" },
    inputContainer: { display: "flex", alignItems: "center", marginTop: "10px" },
    input: { flex: 1, padding: "10px", border: "1px solid #ddd" },
    button: { padding: "10px", backgroundColor: "blue", color: "white", border: "none", cursor: "pointer" },
    fileInput: { margin: "10px" },
    select: { padding: "10px", border: "1px solid #ddd", marginRight: "5px" }
};

export default Chatbot;
