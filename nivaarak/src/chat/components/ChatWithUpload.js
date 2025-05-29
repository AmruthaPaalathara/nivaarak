import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Card, ListGroup, Spinner, Badge, ProgressBar, Button, OverlayTrigger, Tooltip, ButtonGroup   } from "react-bootstrap";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp } from "react-icons/fa";
import FileUpload from "./FileUpload.js";
import MessageInput from "./MessageInput.js";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import 'regenerator-runtime/runtime';
import "../../css/style.css";
import { franc } from "franc";
import axiosInstance from "../../utils/api";
import API from "../../utils/api"; // Import the pre-configured axios instance
import { archiveChatSession } from "../../utils/chatUtils";

console.log("API URL:", process.env.REACT_APP_API_URL);
console.log(" ChatWithUpload component is rendering...");

const PRONOUN_REGEX = /\b(it|this document|that document|that)\b/i;

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
      toast.error(extractResponse.data.message || "Error Applicationextracting text.");
      console.error("Extraction failed:", extractResponse.data.message);
      return "";
    }
  } catch (error) {
    console.error("Error Applicationextracting text:", error.response?.data || error.message);
    toast.error("Error Applicationextracting text.");
    return "";
  }
};

const mapFrancToLangCode = (francCode) => {
  switch (francCode) {
    case "hin": return "hi-IN";
    case "mar": return "mr-IN";
    case "eng": return "en-US";
    default: return "en-US";
  }
};

// API function to send a message
const ChatWithUpload = ({ currentSessionId , onUploadSuccess = () => {} }) => {
  const [message, setMessage] = useState(""); //current input
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]); //chat history
  const [uploadedFile, setUploadedFile] = useState(null); // File metadata
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [error, setError] = useState(null);
  const [voiceLang, setVoiceLang] = useState("en-US");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [hasWarnedAboutExtraction, setHasWarnedAboutExtraction] = useState(false);
  const [archiveNotified, setArchiveNotified] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [documentId, setDocumentId] = useState(null);


  useEffect(() => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      toast.error("Speech recognition is not supported in this browser.");
      setIsSpeechSupported(false);
    }
  }, []);



  useEffect(() => {
    if (!isRecording && transcript) {
      setMessage(transcript.trim());
      resetTranscript();
    }
  }, [isRecording, transcript]);

  const handleVoiceInput = () => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
      setIsRecording(false);
    } else {
      const sampleText = message || messages[messages.length - 1]?.content || "";
      const langCode = franc(sampleText, { minLength: 3 });
      const voiceCode = mapFrancToLangCode(langCode);
      setVoiceLang(voiceCode);

      SpeechRecognition.startListening({ continuous: true, language: voiceCode });
      setIsRecording(true);
    }
  };


  const handlePlayAudio = async (text) => {
        try {
            const resp = await axiosInstance.post(
                  "/tts",
                  { text, lang: voiceLang },
                  { responseType: "blob" }
                );

                const url = URL.createObjectURL(
                  new Blob([resp.data], { type: "audio/mpeg" })
                );
            const audio = new Audio(url);
            audio.play();
          } catch (err) {
            console.error("TTS fetch/play error:", err);
            toast.error("Could not play speech.");
          }
     };

  const handleTranslateAndPlay = async (text, targetLang) => {
    try {
      const resp = await axiosInstance.post(
          "/translator/translation",
          { text, targetLang },
          { responseType: "blob" }
      );
      const url = URL.createObjectURL(
          new Blob([resp.data], { type: "audio/mpeg" })
      );
      new Audio(url).play();
    } catch (err) {
      console.error("Translate-TTS error:", err);
      toast.error("Could not play translated speech.");
    }
  };


  function shouldUseDocumentContext(message, documentId) {
    return Boolean(documentId && PRONOUN_REGEX.test(message));
  }

  const handleClearChat = () => {
    setMessages([]);
    toast.info("Chat cleared, document retained.");
  };

  const handleNewChat = () => {
    const retainDoc = window.confirm("Do you want to keep the uploaded document?");
    setMessages([]);
    setSessionId(uuidv4());
    if (!retainDoc) setUploadedFile(null);
    toast.success("Started a new chat session.");
  };


  // NEW: streamChatResponse that hits /chat/send exactly once
  const streamChatResponse = async (
      prompt,
      documentId,
      sessionId,
      lang = "en",
      client = API
  ) => {
    if (typeof prompt !== "string" || !prompt.trim()) {
      toast.error("Invalid message prompt.");
      return;
    }

    try {
      setMessages(prev => [...prev, { role: 'ai-typing', content: "" }]);

      const { data } = await client.post("/chat/send", {
        sessionId: sessionId || localStorage.getItem("sessionId"),
        documentId: documentId || localStorage.getItem("documentId"),
        message: prompt,
        lang
      });

      const fullResponse = data.message || "No response.";
      let currentText = "";

      for (let ch of fullResponse) {
        currentText += ch;
        setMessages(prev =>
            prev.map(msg =>
                msg.role === "ai-typing" ? { ...msg, content: currentText } : msg
            )
        );
        await new Promise(r => setTimeout(r, 25));
      }

      setMessages(prev =>
          prev.map(msg =>
              msg.role === "ai-typing" ? { ...msg, role: "assistant" } : msg
          )
      );
    } catch (err) {
      const errMsg = err.response?.data?.error || "AI failed to respond.";
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: errMsg }
      ]);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setDocumentId(null);
    setSessionId(null);
    setMessages([]); // Optional: clear chat history
    toast.info("Document removed. You can upload a new one.");
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
    }, 30); // Small delay helps prevent excessive auto-scrolling

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
            documentId: response.data.data.customId, // Must not be undefined
            extractedText: response.data.data.extractedText || "",
            summary: response.data.data.summary || "No summary generated."
          });
          toast.success("File uploaded successfully!");
          console.log("Document ID set in uploadedFile:", response.data.data.customId);

         if (typeof onUploadSuccess === "function") {
            onUploadSuccess(response.data);
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
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);

    try {
      const currentMessage = message.trim();
      if (!currentMessage) {
        toast.error("Message cannot be empty.");
        return;
      }

      // 1️⃣ Echo user
      setMessages(prev => [
        ...prev,
        { role: "user", content: currentMessage, timestamp: new Date() }
      ]);
      setMessage("");

      // 2️⃣ First message → start-chat
      if (!sessionInitialized) {
        const res = await API.post("/chat/start-chat", {
          userId: localStorage.getItem("userId"),
          sessionId,
          documentId: uploadedFile?.documentId || null,
          message: currentMessage,
          lang: "en"
        });

        setSessionId(res.data.sessionId);
        setDocumentId(res.data.chat?.documentId || uploadedFile?.documentId || "");
        setSessionInitialized(true);

        // display the AI reply from start-chat
        setMessages(prev => [
          ...prev,
          { role: "ai", content: res.data.message, timestamp: new Date() }
        ]);

      } else {
        // 3️⃣ Subsequent messages → send & stream
        await streamChatResponse(
            currentMessage,
            uploadedFile?.documentId || "",
            sessionId,
            "en",
            API
        );
      }

      console.log("Uploaded file state before chat start:", uploadedFile);
      console.log("DocumentId being sent:", uploadedFile?.documentId);

    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "ai", content: err.response?.data?.error || "Failed to get response", timestamp: new Date() }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    const sessionId = localStorage.getItem("sessionId");
    const userId = localStorage.getItem("userId");
    const documentId = localStorage.getItem("documentId");

    await archiveChatSession(sessionId, userId, documentId);

    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };
   // Also handle browser/tab close
       useEffect(() => {
           const handleBeforeUnload = (e) => {
               // synchronous request to archive
                   navigator.sendBeacon(
                         `${axiosInstance.defaults.baseURL}/chat/archive`,
                         JSON.stringify({
                               sessionId: currentSessionId,
                       userId: localStorage.getItem("userId"),
                       documentId: uploadedFile?.documentId || null
                 })
               );
             };

               window.addEventListener("beforeunload", handleBeforeUnload);
           return () => {
               window.removeEventListener("beforeunload", handleBeforeUnload);
             };
         }, [currentSessionId, uploadedFile]);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(uuidv4());
    }
  }, [sessionId]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        archiveChatSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentSessionId]);


  return (
    <Container className="chatbot-container mb-3">
      <Row className="justify-content-center ">
        <Col md={8} lg={6} style={{ width: "90%", color: "black" }}>
          <Card className="chat-card shadow-lg p-3">
            <Card.Body>
              <h4 className="text-center mb-3" style={{ color: "black" }}>Government Document AI</h4>

              <ButtonGroup className="mb-3">
                <Button variant="outline-secondary" onClick={handleClearChat}>Clear Chat</Button>
                <Button variant="outline-primary" onClick={handleNewChat}>New Chat</Button>
              </ButtonGroup>


              {/* File Upload Section */}
              <FileUpload
                  onFileSelect={handleFileUpload}
                  uploadedFile={uploadedFile}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onRemove={handleRemove}
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
                     <span style={{ flex: 1 }}>
                        {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                     </span>
                      {msg.role === "ai" && (
                          <ButtonGroup size="sm" className="ms-2">
                            {/* Play original speech */}
                            <Button variant="link" onClick={() => handlePlayAudio(msg.content)}>
                              <FaVolumeUp size={20} color="blue" />
                            </Button>
                            {/* Play English translation */}
                            <Button variant="link" onClick={() => handleTranslateAndPlay(msg.content, "en-US")}>
                              EN
                            </Button>
                            {/* Play Marathi translation */}
                            <Button variant="link" onClick={() => handleTranslateAndPlay(msg.content, "mr-IN")}>
                              MR
                            </Button>
                          </ButtonGroup>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}

                <div ref={messagesEndRef} className="mt-3" />
              </ListGroup>


              {/* Message Input Section */}
              <div className="d-flex align-items-center mt-3">
                <MessageInput
                  message={message}
                  setMessage={setMessage}
                  sendMessage={handleSendMessage}
                  loading={isSending}
                />
                <OverlayTrigger placement="top" overlay={<Tooltip>{isRecording ? "Stop Voice Input" : "Start Voice Input"}</Tooltip>}>
                  <Button variant="link" onClick={handleVoiceInput}>
                    {listening ? <FaMicrophoneSlash size={24} color="red" /> : <FaMicrophone size={24} color="green" />}
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