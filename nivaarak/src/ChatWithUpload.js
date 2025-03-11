import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ChatWithUpload = () => {
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState("");
  const [extractedDetails, setExtractedDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Handle File Selection
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create URL for preview if it's a PDF
      if (selectedFile.type === "application/pdf") {
        const fileUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(fileUrl);
      }
    }
  };

  // Handle File Upload & Extraction
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);
    setUploading(true);

    try {
      const res = await axios.post("http://localhost:3001/extract-details", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocumentId(res.data.documentId);
      setExtractedDetails(res.data.extractedDetails);

      toast.success(`Document "${file.name}" processed successfully!`, {
        position: "top-right",
        autoClose: 3000,
      });
      
      // Add system message to chat history
      setChatHistory([
        ...chatHistory,
        {
          type: "system",
          content: `Document "${file.name}" has been processed and is ready for questions.`
        }
      ]);
    } catch (error) {
      toast.error("File processing failed. Please try again.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setUploading(false);
    }
  };

  // Toggle file preview
  const toggleFilePreview = () => {
    if (file && previewUrl) {
      setShowFilePreview(!showFilePreview);
    }
  };

  // Send Message to Chatbot Based on Extracted Document
  const sendMessage = async (e) => {
    e && e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    if (!documentId) {
      // If no document is uploaded, handle file upload first
      if (file) {
        await handleUpload();
      } else {
        toast.warning("Please upload a document first", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    // Add user message to chat history
    const userMessage = message;
    const newChatHistory = [
      ...chatHistory,
      { type: "user", content: userMessage }
    ];
    setChatHistory(newChatHistory);
    
    setLoading(true);
    setMessage("");
    
    try {
      const res = await axios.post("http://localhost:3001/ask-document", {
        question: userMessage,
        documentId,
      });
      
      // Add AI response to chat history
      setChatHistory([
        ...newChatHistory,
        { type: "ai", content: res.data.response }
      ]);
    } catch (error) {
      console.error("Error communicating with chatbot:", error);
      
      // Add error message to chat history
      setChatHistory([
        ...newChatHistory,
        { 
          type: "system", 
          content: "I encountered an error while processing your request. Please try again." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Reset everything
  const resetChat = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setDocumentId("");
    setExtractedDetails(null);
    setMessage("");
    setChatHistory([]);
    setPreviewUrl(null);
    setShowFilePreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle key press in message input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col">
        {/* Main Chat Container */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 flex flex-col flex-1">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                <path d="M8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              </svg>
              <h2 className="font-serif text-xl font-bold">DocumentAI Assistant</h2>
            </div>
            <div>
              <button
                onClick={resetChat}
                className="text-white hover:text-indigo-100 transition-colors"
                title="Reset conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div 
            className="flex-1 p-4 overflow-y-auto bg-gray-50" 
            ref={chatContainerRef}
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div className="max-w-md">
                  <div className="bg-indigo-100 text-indigo-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">DocumentAI Assistant</h3>
                  <p className="text-gray-600 mb-4">Upload a document using the form below and I'll help you extract insights from it.</p>
                  <p className="text-sm text-indigo-500">You can ask me specific questions about your document after uploading.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      rounded-2xl px-4 py-3 max-w-md
                      ${msg.type === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : msg.type === 'ai' 
                          ? 'bg-white border border-gray-200 text-gray-700 shadow-sm' 
                          : 'bg-gray-100 text-gray-600 text-sm border border-gray-200 mx-auto'} 
                    `}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 max-w-md shadow-sm">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* File Upload and Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {file ? (
              <div className="mb-3 flex items-center bg-indigo-50 p-2 rounded-lg">
                <div className="text-indigo-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 text-sm truncate text-indigo-700" onClick={toggleFilePreview} style={{cursor: 'pointer'}}>
                  {file.name}
                </div>
                {!documentId && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="ml-2 text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    {uploading ? "Processing..." : "Process"}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}
            
            <div className="flex items-end gap-2">
              {!file && (
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    id="file-upload"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </label>
                </div>
              )}
              
              <div className="flex-1 relative">
                <form onSubmit={sendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading || uploading}
                    placeholder={file && !documentId ? "Processing document..." : "Ask a question about your document..."}
                    className="w-full p-3 pr-12 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-70 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || uploading || (!file && !message.trim())}
                    className="absolute right-2 rounded-full p-2 text-indigo-600 hover:bg-indigo-100 transition-all disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              {file && !documentId ? 
                "Click 'Process' to analyze your document before asking questions." : 
                "Your documents are processed securely and not stored permanently."
              }
            </div>
          </div>
        </div>
      </div>
      
      {/* File Preview Modal */}
      {showFilePreview && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={toggleFilePreview}>
          <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium text-lg">{file?.name}</h3>
              <button onClick={toggleFilePreview} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe 
                src={previewUrl} 
                className="w-full h-full" 
                title="Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer />
    </div>
  );
};

export default ChatWithUpload;