import React, { Suspense } from "react";
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
import { useAuth } from "./contexts/AuthContext";


//  Keep only one `App` function
const HomePage = () => (
    <>
        <CustomCarousel/>
        <About id="about-section"/>
    </>
);

  const AppContent = () => {
    const {isAuthenticated} = useAuth();


    return (
        <>
            <Navbar/>
            <div className="main-content mt-5">
              <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  <Route path="/" element={<HomePage/>}/>
                  <Route path="/registration" element={<Register/>}/>
                  <Route path="/forgot-password" element={<ForgotPassword/>}/>
                    <Route path="/signin" element={<Signin />} />
                  {/* other nav items */}

                  <Route path="/chat" element={isAuthenticated ? <ChatWithUpload/> : <Navigate to="/signin"/>}/>
                    <Route path="/application" element={<ApplicationForm />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/"/>}/>
                </Routes>
              </Suspense>
            </div>
            {/* <EmailForm /> */}
            <Footer/>
</>
  );
  };

  // Wrap with providers
  const App = () => {
    return (
        <AuthProvider>
          <ChatProvider>
            <ErrorProvider>

              <AppContent/>

            </ErrorProvider>
          </ChatProvider>
        </AuthProvider>
    );
  };
export default App;
