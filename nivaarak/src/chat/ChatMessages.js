// ChatMessages.js
import React from "react";
import '../css/style.css';

const ChatMessages = ({ chatHistory, loading, chatContainerRef }) => {
  return (
    <div className="chat-messages" ref={chatContainerRef}>
      {chatHistory.length === 0 ? (
        <p className="text-center text-gray-600">Upload a document and start chatting!</p>
      ) : (
        chatHistory.map((msg, index) => (
          <div key={index} className={`message ${msg.type === 'user' ? 'user-message' : 'ai-message'}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))
      )}
      {loading && <p className="text-center">Loading...</p>}
    </div>
  );
};

export default ChatMessages;