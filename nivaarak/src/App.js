import React, { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./partials/Header";
import CustomCarousel from "./homePage/Carousel";
import About from "./homePage/About";
import Footer from "./partials/Footer";
import Register from "./Login/Registerform";
import Signin from "./Login/Signin";
import ForgotPassword from "./Login/ForgotPassword";
import { ChatProvider } from "./chat/contexts/chatContext";
import { ErrorProvider } from "./chat/contexts/errorContext";
import { AuthProvider } from "./contexts/AuthContext";
import ApplicationForm from "./certificateApplication/ApplicationForm.js";
import ChatWithUpload from "./chat/components/ChatWithUpload";
import EmailForm from "./certificateApplication/EmailForm.js";
import Profile from "./dashboard/Profile.js";

// ✅ Keep only one `App` function
const App = () => {
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", email);
    formData.append("document", document);

    try {
      const response = await axios.post("http://localhost:5000/send-email", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Failed to send email.");
      console.error("Error:", error);
    }
  };

  const HomePage = () => (
    <>
      <CustomCarousel />
      <About id="about-section" />
    </>
  );

  return (
    <AuthProvider>
      <ChatProvider>
        <ErrorProvider>
          <Navbar />
          <div className="main-content mt-5">
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/chat" element={<ChatWithUpload />} />
                <Route path="/registration" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/application" element={<ApplicationForm />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </div>
          {/* <EmailForm /> */}
          <Footer />
        </ErrorProvider>
      </ChatProvider>
    </AuthProvider>
  );
};

export default App;
