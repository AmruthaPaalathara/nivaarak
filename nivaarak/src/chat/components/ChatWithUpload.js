import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Card, ListGroup, Spinner, Badge, ProgressBar, Button, OverlayTrigger, Tooltip  } from "react-bootstrap";
import { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp } from "react-icons/fa";
import FileUpload from "./FileUpload.js";
import MessageInput from "./MessageInput.js";
import axios from "axios";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import "../../css/style.css";
import SpeechRecognition from "react-speech-recognition";
import axiosInstance from "../../utils/api";
import API from "../../utils/api"; // Import the pre-configured axios instance


console.log("API URL:", process.env.REACT_APP_API_URL);

console.log(" ChatWithUpload component is rendering...");

const fetchDocumentTextFromAPI = async (documentId) => {
  const accessToken = localStorage.getItem("accessToken");

  if (!documentId) {
    toast.error("Invalid document ID for extraction.");
    console.error(" Document ID missing from upload response!");
    return "";
  }

  try {
    const extractResponse = await API.post("/documents/extract-text",
        { customId: documentId },
        { headers: { "Authorization": `Bearer ${accessToken}` }}
    );

    if (extractResponse.data.success) {
      console.log("Text extracted from document:", extractResponse.data.text);
      return extractResponse.data.text;
    } else {
      toast.error(extractResponse.data.message || "Error extracting text.");
      console.error("Extraction failed:", extractResponse.data.message);
      return "";
    }
  } catch (error) {
    console.error("Error extracting text:", error.response?.data || error.message);
    toast.error("Error extracting text.");
    return "";
  }
};

// API function to send a message
const ChatWithUpload = ({ currentSessionId , onUploadSuccess = () => {} }) => {
  const [message, setMessage] = useState(""); //current input
  const [uploadedFile, setUploadedFile] = useState(null); // File metadata
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  // const token = localStorage.getItem("token");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); //chat history
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const handleRemove = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

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

    let session = sessionId;
    if (!sessionId) {
      session = uuidv4();
      setSessionId(session);
    }
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
      console.log("Payload being sent:", payload);

      setMessages((prevMessages) => {
        if (prevMessages.length > 0 && prevMessages[prevMessages.length - 1].content === message) {
          return prevMessages; // Prevent duplicate messages
        }
        return [...prevMessages, { role: "user", content: message, timestamp: new Date() }];
      });
      console.log("Payload being sent to AI:", payload);

        const response = await axiosInstance.post("/chat/send", payload);

        const data = response.data;
      console.log("AI response:", data); // for debug
        // handle the data as needed

        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "ai", content: data.reply, timestamp: new Date() }
        ]);
        return data;
      } catch (error) {
        console.error("Error sending message:", error.message);
        setError("Failed to get AI response.");
        toast.error("Failed to send message. Please try again.");
        throw error;
      }
    };

  useEffect(() => {
    console.log("Document ID updated:", uploadedFile?.documentId);
  }, [uploadedFile?.documentId]);

  // Auto-scroll optimization using callback ref
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100); // Small delay helps prevent excessive auto-scrolling

    return () => clearTimeout(timeout);
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
    const handleFileUpload = async (file) => {
      console.log("handleFileUpload triggered");
      if (!file) {
        console.error("No file selected or input is missing.");
        toast.error("No file selected.");
        return;
      }
      console.log("Selected file:", file);

      const accessToken = localStorage.getItem("accessToken");
      const userId = localStorage.getItem("userId");

      if (!accessToken || !userId) {
        toast.error("Unauthorized. Please log in again.");
        console.error("Missing authentication tokens.");
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      console.log("File selected:", file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      try {
        const response = await axiosInstance.post("/documents/upload", formData, {

          headers: {  "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${accessToken}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        });

        console.log("Upload response:", response.data);
        console.log("Axios base URL:", axiosInstance.defaults.baseURL);
        if (response.data.success) {
          const customId = response.data.data.customId;
          if (!customId) {
            console.error("Upload response missing 'customId':", response.data);
            toast.error("File upload succeeded but document ID is missing. Please try again.");
            return;
          }
          console.log("Upload success:", response.data);
          setUploadedFile({
            name: response.data.data.file?.originalname || "Unknown file",
            documentId: customId,
            extractedText: response.data.data.extractedText || "",
          });
          toast.success("File uploaded successfully!");

         if (typeof onUploadSuccess === "function") {
            onUploadSuccess(response.data);
          }

          try {
            const extractedText = await fetchDocumentTextFromAPI(customId);
            if (extractedText) {
              console.log("Text extracted successfully:", extractedText);
            }
          } catch (fetchError) {
            console.error("Error fetching document text:", fetchError);
            toast.error("Could not extract text from document.");
          }

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

  const handleSendMessage = async (e) => {
    if (isSending) return; // Prevent duplicate messages
    setIsSending(true); // Indicate sending has started

    if (e && e.preventDefault) {
      e.preventDefault();
    }

    try {
      if (!message.trim()) {
        toast.error("Message cannot be empty.");
        return;
      }

      console.log("handleSendMessage triggered");
      console.log("Message:", message);
      console.log("Before sending, documentId:", uploadedFile?.documentId);
      console.log("Sending message to backend:", { message, documentId: uploadedFile?.documentId || "No document attached" });

      const currentMessage = message;
      setMessage("");

      //  New code: Archive uploaded document before sending message
      if (uploadedFile && uploadedFile.documentId && !uploadedFile.isArchived) {
        try {
          console.log("Archiving uploaded document...");
          const accessToken = localStorage.getItem("accessToken");

          await axiosInstance.post("/documents/archive-temp", {
            customId: uploadedFile.documentId,
            userId: localStorage.getItem("userId"),
          }, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          });

          console.log("Document archived successfully!");

          // Update the uploadedFile state to mark it as archived
          setUploadedFile((prev) => ({ ...prev, isArchived: true }));

        } catch (archiveError) {
          console.error("Failed to archive document:", archiveError);
          toast.error("Failed to archive document.");
        }
      }

      // Add user message to chat
      const userMessage = { role: "user", content: currentMessage, timestamp: new Date() };
      setMessages((prevMessages) => [...prevMessages, userMessage]);

      if (!uploadedFile || !uploadedFile.documentId || !uploadedFile.extractedText) {
        toast.warning("Please upload a valid document and wait for processing.");
        return;
      }

      console.log("uploadedFile.documentId:", uploadedFile?.documentId ?? "No document available");

      let extractedText = uploadedFile?.extractedText || "";
      if (!extractedText && uploadedFile?.documentId) {
        try {
          const ocrResponse = await axiosInstance.post("/documents/extract-text",  { customId: uploadedFile?.documentId });
          extractedText = ocrResponse.data.text || "";
        } catch (ocrError) {
          console.error("OCR extraction failed:", ocrError);
          toast.error("Failed to extract text from document.");
        }
      }

      console.log("uploadedFile.documentId", uploadedFile.documentId);

      const tempMessages = [...messages, userMessage];

      // Send the message to the backend via our sendMessage API function
      const chatResponse = await sendMessage(currentMessage, sessionId, setSessionId, tempMessages, setMessages, uploadedFile?.documentId || null, extractedText || "");

      console.log("Received chatResponse from backend:", chatResponse);

      // Handle AI response
      const aiResponse = chatResponse?.message || "AI response format is not as expected";
      if (!chatResponse?.content) {
        console.error("Unexpected response format:", chatResponse);
      }

    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage = error.response?.data?.error || "Failed to get response";

      // Add fallback response if backend fails
      setMessages((prevMessages) => [...prevMessages, { role: "ai", content: errorMessage, timestamp: new Date() }]);
    } finally {
      setIsSending(false);
    }
  };

  const archiveChatSession = async () => {
    try {
      if (!currentSessionId) {
        console.warn("Skipping archive: No session ID found.");
        return;
      }

      const data = { customId: currentSessionId };
      const response = await axios.post('http://localhost:3001/api/chat/archive', data, { withCredentials: true });

      console.log(response.data);
    } catch (error) {
      console.error('Error archiving session:', error);
    }
  };
  useEffect(() => {
    let timeout;

    const handleVisibilityChange = () => {
      clearTimeout(timeout);
      if (document.visibilityState === "hidden" && currentSessionId) {
        timeout = setTimeout(() => archiveChatSession(), 2000); // Archive only after 2 seconds
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentSessionId]);


      useEffect(() => {
          const handleVisibilityChange = () => {
              if (document.visibilityState === "hidden") {
                  archiveChatSession();
              }
          };

          document.addEventListener("visibilitychange", handleVisibilityChange);

          return () => {
              document.removeEventListener("visibilitychange", handleVisibilityChange);
          };
      }, [currentSessionId]);

      return (
    <Container className="chatbot-container mb-3">
      <Row className="justify-content-center ">
        <Col md={8} lg={6} style={{ width: "90%", color: "black" }}>
          <Card className="chat-card shadow-lg p-3">
            <Card.Body>
              <h4 className="text-center mb-3" style={{ color: "black" }}>Government Document AI</h4>

              {/* File Upload Section */}
              <FileUpload
                  onFileSelect={handleFileUpload}
                  uploadedFile={uploadedFile}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onRemove={() => setUploadedFile(null)}
              />


              {/* Chat Messages Section */}
              <ListGroup className="chat-messages p-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                  <ListGroup.Item
                      key={msg.id ?? `${uuidv4()}-${index}`}
                    // Use a unique key (e.g., msg.id if available)
                    className={`message ${msg.type}-message`}
                    style={{
                      whiteSpace: "pre-wrap",
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      backgroundColor: msg.role === "user" ? "#DCF8C6" : "#FFFFFF",
                      padding: "10px",
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
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }) : "Time unavailable"}
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
                <OverlayTrigger placement="top" overlay={<Tooltip>{isRecording ? "Stop Voice Input" : "Start Voice Input"}</Tooltip>}>
                  <Button variant="link" onClick={handleVoiceInput}>
                    {isRecording ? <FaMicrophoneSlash size={24} color="red" /> : <FaMicrophone size={24} color="green" />}
                  </Button>
                </OverlayTrigger>

              </div>

            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
  };


export default ChatWithUpload;