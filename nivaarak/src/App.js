import './App.css';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './partials/Header';
import CustomCarousel from './Carousel';
import About from './About';
import Footer from './partials/Footer';
import Register from './Login/Registerform';
import Signin from './Login/Signin';
import ForgotPassword from './Login/ForgotPassword';
import ChatWithUpload from "./components/ChatWithUpload";
import Navbar from "./components/Navbar";
import Chatbot from "./components/Chatbot"

function HomePage() {
  return (
    <>
      <CustomCarousel />
      <About id="about-section" />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element = {<Signin />} />
        <Route path="/registration" element={<Register />} />
        <Route path="/forgot-password" element = {<ForgotPassword />} />
        <Route path="/Chatwithupload" element={<ChatWithUpload />} />
        <Route path="/chatbot" element = {<Chatbot />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
