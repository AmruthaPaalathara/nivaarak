import React, { useRef, useEffect } from "react";
import { Form, Button, InputGroup, Container, Spinner } from "react-bootstrap";
import { Send, Paperclip } from "react-bootstrap-icons";
import '../css/style.css';

const MessageInput = ({ message, setMessage, sendMessage, loading, uploading }) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;  // ✅ Fixed
    }
  }, [message]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Container className="p-3">
      <div className="rounded p-3 text-light shadow-lg message-input-container">
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
              <Paperclip size={18} />
            </Button>

            <Form.Control
              as="textarea"
              ref={textareaRef}
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || uploading}
              rows={1}
              className="message-textarea"
              style={{
                background: "transparent",
                color: "white",
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
                <Send size={20} />
              )}
            </Button>
          </InputGroup>
        </Form>
      </div>
    </Container>
  );
};

export default MessageInput;
