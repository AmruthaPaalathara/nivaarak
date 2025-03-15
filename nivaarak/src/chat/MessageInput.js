// MessageInput.js
import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { Form, Button, InputGroup, Container, Spinner } from "react-bootstrap";
import { Send, Paperclip } from "react-bootstrap-icons";
import { toast } from "react-toastify";
import "../css/style.css";

const MessageInput = ({
  message,
  setMessage,
  sendMessage,
  loading,
  setDocumentId,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(""); // State to store the uploaded file name

  // Handle file selection and upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadedFileName(file.name); // Set the uploaded file name

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await axios.post("http://localhost:3001/extract-details", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocumentId(res.data.documentId);
      toast.success("Document uploaded successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      toast.error("Error uploading document", {
        position: "top-right",
        autoClose: 3000,
      });
      setUploadedFileName(""); // Clear the file name on error
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container className="p-3">
      <div className="rounded p-3 text-dark shadow-lg message-input-container">
        <Form onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}>
          <InputGroup className="border rounded-pill p-2 message-input-group">
            {/* Optional file attachment button */}
            <Button 
              variant="link" 
              className="text-light attachment-btn"
              disabled={loading || uploading}
            >
              <Paperclip size={18} fill="black" />
            </Button>

            {/* Hidden file input */}
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Display uploaded file name */}
            {uploadedFileName && (
              <span className="ml-2 text-dark">{uploadedFileName}</span>
            )}

            <Form.Control
              as="textarea"
              ref={textareaRef}
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              disabled={loading || uploading}
              rows={1}
              className="message-textarea"
              style={{
                background: "transparent",
                color: "black",
                border: "none",
                outline: "none",
                resize: "none",
                overflow: "auto",
              }}
            />

            <Button
              variant="link"
              type="submit"
              disabled={loading || uploading || !message.trim()}
              className={`text-light chatbot-send-button  ${message.trim() ? 'send-active' : ''}`} 
            >
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <Send size={20} fill="black" style={{ transform: "rotate(15deg)" }} />
              )}
            </Button>
          </InputGroup>
        </Form>
      </div>
    </Container>
  );
};

export default MessageInput;