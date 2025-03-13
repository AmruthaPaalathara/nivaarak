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
import ChatWithUpload from "./chat/ChatWithUpload";
import './css/style.css'


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

      </Routes>
      <Footer />
    </div>
  );
}

export default App;
