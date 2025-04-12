import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Create the AuthContext
const AuthContext = createContext();

// AuthProvider component to wrap around your application
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check for an existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!token) {
      navigate("/signin"); // or hide the application form
    }
  }, []);

  // Login function
  const login = (token, rememberMe = false) => {
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem("accessToken", token); // Store token in localStorage for persistent login
    } else {
      sessionStorage.setItem("accessToken", token); // Store token in sessionStorage for session-based login
    }
  };

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("accessToken"); // Clear token from localStorage
    sessionStorage.removeItem("accessToken"); // Clear token from sessionStorage
  };

  // Value to be provided by the context
  const value = {
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}