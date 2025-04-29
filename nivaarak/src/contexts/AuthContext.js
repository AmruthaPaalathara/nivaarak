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
    const token = localStorage.getItem("accessToken") ;
    if (token) {
      setIsAuthenticated(true);
    } else {
      // Try to refresh token using the refresh cookie
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/auth/refresh-token`, {
        method: "POST",
        credentials: "include", // This sends cookies (like refreshToken)
      })
          .then((res) => res.json())
          .then((data) => {
            if (data.accessToken) {
              localStorage.setItem("accessToken", data.accessToken); // Or sessionStorage based on preference
              setIsAuthenticated(true);
            } else {
              navigate("/signin");
            }
          })
          .catch(() => {
            navigate("/signin");
          });
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
  const logout = async () => {

    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    setIsAuthenticated(false);
    localStorage.removeItem("accessToken"); // Clear token from localStorage
    sessionStorage.removeItem("accessToken"); // Clear token from sessionStorage
    navigate("/signin");
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