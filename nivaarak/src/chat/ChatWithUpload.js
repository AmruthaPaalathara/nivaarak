import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Container, Card } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ChatMessages from "./ChatMessages";
import MessageInput from "./MessageInput";
import '../css/style.css';

const ChatWithUpload = () => {
  const [documentId, setDocumentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  // Scroll chat to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Archive chat when closing the session
  const archiveChatAndClear = async () => {
    if (chatHistory.length === 0) return;

    try {
      await axios.post("http://localhost:3001/archive-chat", { chatHistory });

      setChatHistory([]);
      setDocumentId("");

      toast.success("Chat archived successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      toast.error("Failed to archive chat. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Send message to chatbot
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!documentId) {
      toast.warning("Please upload a document first", { position: "top-right", autoClose: 2000 });
      return;
    }

    const newChatHistory = [...chatHistory, { type: "user", content: message }];
    setChatHistory(newChatHistory);
    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/ask-document", { question: message, documentId });

      setChatHistory([...newChatHistory, { type: "ai", content: res.data.response }]);
    } catch (error) {
      setChatHistory([...newChatHistory, { type: "system", content: "Error processing request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="p-4 chatbot-container">
      <Card className="shadow-lg p-3">
        <Card.Body>
          <Card.Title className="text-center mb-3">Chat with DocumentAI</Card.Title>
          <ChatMessages chatHistory={chatHistory} loading={loading} chatContainerRef={chatContainerRef} />
          <MessageInput 
            message={message} 
            setMessage={setMessage} 
            sendMessage={sendMessage} 
            loading={loading} 
          />
        </Card.Body>
      </Card>
      
      <ToastContainer />
    </Container>
  );
};

export default ChatWithUpload;
