import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Card, ListGroup, Spinner, Badge, ProgressBar, Button, } from "react-bootstrap";
import { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp } from "react-icons/fa";
import FileUpload from "./FileUpload.js";
import MessageInput from "./MessageInput.js";
import axios from "axios";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import "../../css/style.css";
import SpeechRecognition from "react-speech-recognition";

console.log("API URL:", process.env.REACT_APP_API_URL);

console.log(" ChatWithUpload component is rendering...");

const fetchDocumentTextFromAPI = async (file) => {

  if (!file) {
    console.error("No file provided for upload.");
    toast.error("Please upload a file before extracting text.");
    return;
}

  try {
    const formData = new FormData();
    formData.append("file", file); // Correctly append the file

    const response = await axios.post("/api/documents/extract-text", formData, { headers: { "Content-Type": "multipart/form-data" } });

    if (response.data.success) {
      console.log("Extracted Text from Document (via API):", response.data.text);
      return response.data.text;
    }
    return "";
  } catch (error) {
    console.error("Error extracting text via API:", error.response ? error.response.data : error.message);
    return "";
  }
};

// API function to send a message

const ChatWithUpload = () => {
  const [message, setMessage] = useState(""); //curretn input
  const [uploadedFile, setUploadedFile] = useState(null); // File metadata
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  // const token = localStorage.getItem("token");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); //chat history
  const [isSending, setIsSending] = useState(false);


  const {
    transcript, // The transcribed speech text
    resetTranscript, // To reset the transcript
    listening, // Boolean indicating if speech recognition is active
  } = useSpeechRecognition();

  // Send the transcript (recognized text) to your chat message handler
  useEffect(() => {
    if (!isRecording && transcript) {
      setMessage(transcript.trim());
      resetTranscript(); // Optionally reset the transcript for the next recording
    }
  }, [isRecording, transcript]);

  // Handle the start/stop of speech input
  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop the recording and process the recognized speech
      setIsRecording(false);
      SpeechRecognition.stopListening();  // Stop the listening process
      console.log("Stopped recording...");
    } else {
      // Start recording
      setIsRecording(true);
      SpeechRecognition.startListening({
        continuous: true, // Keep listening continuously
        language: "mr-IN", // Specify the language code for Marathi
      });
      console.log("Started recording...");
    }
  };

  const handlePlayAudio = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US"; // Set language (adjust if needed)
    speech.rate = 1.0; // Adjust speech speed
    speechSynthesis.speak(speech);
  };

  const sendMessage = async (message, sessionId, setSessionId, messages, setMessages, documentId, extractedText) => {

    if (!message.trim()) {
      toast.error("Message cannot be empty.");
      return;
  }
  
  const userId = localStorage.getItem("userId");
  console.log("UserId from localStorage:", userId);

  if (!userId) {
      toast.error("User ID missing. Please log in again.");
      return;
  }
  
  if (!sessionId) {
    var newSession = uuidv4();
    setSessionId(newSession);
  }
  const session = sessionId || newSession;
    
    // Generate UUID if no sessionId
    try {
      let context = extractedText || "";
      if (!context && documentId) {
        try {
          // Fetch document text only if extractedText is not provided
          context = await fetchDocumentTextFromAPI(documentId);
        } catch (docError) {
          console.warn("Failed to fetch document text:", docError.message);
        }
      }
  
      const chatHistory = messages ? messages.map((msg) => ({
        role: msg.role, 
        content: msg.content,
      })) : [];    
  
      // Build the payload including the context
      const payload = {
        userId,
        message,
        sessionId: session,
        documentId: documentId || null,
        context, // Updated extracted text
        chatHistory, // Include chat history for AI context
      };
  
      setMessages((prevMessages) => {
        if (prevMessages.length > 0 && prevMessages[prevMessages.length - 1].content === message) {
          return prevMessages; // Prevent duplicate messages
        }
        return [...prevMessages, { role: "user", content: message, timestamp: new Date() }];
      });
      
      console.log("Payload being sent to AI:", payload);
  
      const response = await fetch("http://localhost:3000/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
          if (!response.ok) {
            const data = await response.json();
              throw new Error(data.message || "Failed to get AI response.");
          }
          const data = await response.json();
          console.log("Chat Response:", data);
  
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "ai", content: data.reply, timestamp: new Date() }
      ]);
  
      return data;
    } catch (error) {
      console.error("Error sending message:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to send message. Please try again.");
      throw error;
    }
  };


  useEffect(() => {
    console.log("Document ID updated:", uploadedFile?.documentId);
  }, [uploadedFile?.documentId]);

  // Auto-scroll optimization using callback ref
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Debugging: Log uploaded file & messages only in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Uploaded file:", uploadedFile);
      if (uploadedFile) {
        console.log("Document ID:", uploadedFile?.documentId);
      }
    }
  }, [uploadedFile]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Messages updated:", messages);
    }
  }, [messages]);

  useEffect(() => {
    if (uploadedFile) {
      console.log("File Uploaded Successfully:", uploadedFile);
    }
  }, [uploadedFile]);

  const onUploadError = (error) => {
    console.error("Upload error:", error);
    toast.error("File upload failed");
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected.");
      return;
  }

    setUploading(true);
    setUploadProgress(0);
    console.log("File selected:", file);


    const formData = new FormData();
    formData.append("file", file);
    const extractedText = await fetchDocumentTextFromAPI(file);

    if (extractedText) {
        console.log("Text extracted successfully:", extractedText);
    }

    try {
      const response = await axios.post("/api/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        console.log("Upload success:", response.data);
        setUploadedFile({
          name: response.data.data.filename,
          documentId: response.data.data.customId,
          extractedText: response.data.data.extractedText,
        });
        toast.success("File uploaded successfully!");

        // Call onUploadSuccess
        onUploadSuccess(response.data);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("File upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    if (isSending) return; // Prevent duplicate messages
    setIsSending(true); // Indicate sending has started
    
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!message.trim()) return;

    console.log("handleSendMessage triggered");
    console.log("Message:", message);

    // Optional: Log the current documentId state
    console.log("Before sending, documentId:", uploadedFile?.documentId);

    console.log("Sending message to backend:", { message, documentId: uploadedFile?.documentId || "No document attached" });


    const currentMessage = message;
    setMessage("");
    // setMessages((prevMessages) => [...prevMessages, { role: "user", content: currentMessage, timestamp: new Date() }]);

    // // Add user message to chat
    const userMessage = { role: "user", content: currentMessage, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    // // const currentMessage = message;
    // // setMessage("");

    try {

      if (!uploadedFile || !uploadedFile.documentId || !uploadedFile.extractedText) {
        toast.warning("Please upload a valid document and wait for processing.");
        return;
      }


      let extractedText = uploadedFile?.extractedText || "";

      if (uploadedFile && !uploadedFile.extractedText) {
        console.log("Extracting text from document...");
        const ocrResponse = await axios.post("/api/documents/extract-text", { documentId: uploadedFile.documentId });
        extractedText = ocrResponse.data.text || "";
      }

      if (isSending) return;
      setIsSending(true);

      // Send the message to the backend via our sendMessage API function
      const chatResponse = await sendMessage(currentMessage, sessionId, setSessionId,messages, setMessages, uploadedFile?.documentId || null, extractedText || "");
      console.log("Received chatResponse from backend:", chatResponse);

      // Update chat messages with the AI response, using the correct key from the backend (response.response)
      const aiResponse = chatResponse?.content || "AI response format is not as expected";
      if (!chatResponse?.content) {
        console.error("Unexpected response format:", chatResponse);
      }
      // setMessages((prevMessages) => [
      //   ...prevMessages,
      //   { role: "ai", content: aiResponse, timestamp: new Date() }
      // ]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage = error.response?.data?.error || "Failed to get response";

      // Fallback response if backend fails
      // const fallbackResponse = await new Promise((resolve) => setTimeout(() => resolve(`This is a fallback response for: "${currentMessage}"`), 1000));
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "ai", content: errorMessage, timestamp: new Date() },
      ]);
    }
  };

  return (
    <Container className="chatbot-container mt-5 mb-3">
      <Row className="justify-content-center">
        <Col md={8} lg={6} style={{ width: "90%", color: "black" }}>
          <Card className="chat-card shadow-lg p-3">
            <Card.Body>
              <h4 className="text-center mb-3" style={{ color: "black" }}>Government Document AI</h4>

              {/* File Upload Section */}
              <FileUpload
                handleFileUpload={handleFileUpload}
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                uploading={uploading}
                uploadProgress={uploadProgress}
                onUploadSuccess={(data) => {
                  console.log("Full Upload Response:", data);
                  if (!data || !data.data || !data.data.customId) {
                    console.error("Unexpected response structure:", data);
                    toast.error("Unexpected response from the server");
                    return;
                  }
                  console.log("Upload success:", data);
                  setUploadedFile({
                    name: data.data.filename,
                    documentId: data.data.customId,
                    extractedText: data.data.extractedText,
                  });
                  toast.success("File uploaded successfully!");
                }}
                onUploadError={(error) => {
                  console.error("Upload error:", error);
                  toast.error("File upload failed");
                }}
              />


              {uploading && (
                <ProgressBar
                  now={uploadProgress}
                  label={`${uploadProgress}%`}
                  className="mt-2"
                  striped
                  animated
                />
              )}

              {/* Chat Messages Section */}
              <ListGroup className="chat-messages p-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                  <ListGroup.Item
                    key={`${index}-${msg.timestamp ? msg.timestamp.toISOString() : Date.now()}`}
                    // Use a unique key (e.g., msg.id if available)
                    className={`message ${msg.type}-message`}
                    style={{
                      whiteSpace: "pre-wrap",
                      backgroundColor: msg.role === "user" ? "#DCF8C6" : "#FFFFFF",
                      marginLeft: msg.role === "user" ? "auto" : "0",
                      marginRight: msg.role === "user" ? "0" : "auto",
                      maxWidth: "80%",
                      borderRadius: "15px",
                      border: "1px solid #e9ecef",
                      boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
                      marginTop: msg.type === "user" ? "2" : "2",

                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Badge bg={msg.role === "user" ? "primary" : msg.role === "system" ? "warning" : "secondary"}>
                        {msg.role === "user" ? "You" : "AI"}
                      </Badge>
                      <small className="text-muted">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </small>
                    </div>


                    <div className="message-content mt-2 p-2 rounded">
                      <span style={{ flex: 1 }}>{msg.content}</span>
                      {msg.role === "ai" && (
                        <Button variant="link" onClick={() => handlePlayAudio(msg.content)}>
                          <FaVolumeUp size={20} color="blue" />
                        </Button>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}

                <div ref={messagesEndRef} className="mt-3" />
              </ListGroup>


              {/* Debug: Display raw messages state */}
              {/* <pre>{JSON.stringify(messages, null, 2)}</pre> */}



              {/* Message Input Section */}
              <div className="d-flex align-items-center mt-3">
                <MessageInput
                  message={message}
                  setMessage={setMessage}
                  sendMessage={handleSendMessage}
                  loading={false}
                />
                <Button variant="link" onClick={handleVoiceInput}>
                  {isRecording ? (
                    <>
                      Stop Recording <FaMicrophoneSlash size={24} color="red" />
                    </>
                  ) : (
                    <>
                      <FaMicrophone size={24} color="green" />
                    </>
                  )}
                </Button>

              </div>

            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};


export default ChatWithUpload;