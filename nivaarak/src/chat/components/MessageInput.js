  import React, { useRef, useEffect } from "react";
  import { Form, Button, InputGroup, Spinner } from "react-bootstrap";
  import { Send } from "react-bootstrap-icons";
  import PropTypes from "prop-types";
  import "../../css/style.css";

  /**
   * MessageInput Component
   *
   * @param {string} message - The current message text.
   * @param {Function} setMessage - Function to update the message text.
   * @param {Function} sendMessage - Function to send the message.
   * @param {boolean} loading - Indicates if a message is currently being sent.
   */
  const MessageInput = ({ message, setMessage, sendMessage, loading }) => {
    const textareaRef = useRef(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // Max height 200px
            textareaRef.current.style.overflow = "hidden"; // Hide scrollbar
        }
    }, [message]);
    

  // Auto-focus textarea on mount (with delay for better re-renders)
  useEffect(() => {
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
  }, []);


      const handleSendMessage = (e) => {
          e.preventDefault();
          if (message.trim()) {
              sendMessage(e); // ✅ Do NOT pass e
          }
      };

      const handleKeyDown = (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // Prevent new line
              sendMessage(e);      // ✅ Do NOT pass e
          }
      };


    return (
      <InputGroup className="message-input w-100">
        <Form.Control
          as="textarea"
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          aria-label="Type your message"
          aria-describedby="message-input-description"
          disabled={loading}
          className="message-textarea flex-grow-1"
          style={{ overflow: "hidden", resize: "none" }}
        />
        <span id="message-input-description" className="visually-hidden">
          Press Enter to send your message.
        </span>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !message.trim()}
          aria-label={loading ? "Sending message, please wait..." : "Send message"}
          aria-busy={loading} // Indicate busy state
          aria-disabled={loading}
          onClick={handleSendMessage}
          className="send-button d-flex align-items-center justify-content-center"
        >
          {loading ? (
            <Spinner
              animation="border"
              size="sm"
              role="status"
              aria-label="Sending message"
              aria-live="polite" // Announce updates
            >
              <span className="visually-hidden">Sending message...</span>
            </Spinner>
          ) : (
            <Send size={20} />
          )}
        </Button>
      </InputGroup>
    );
  };

  MessageInput.propTypes = {
    message: PropTypes.string.isRequired,
    setMessage: PropTypes.func.isRequired,
    sendMessage: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
  };

  export default MessageInput;