// src/contexts/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef
} from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

// 1) Create the context with default values
const AuthContext = createContext({
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
});

// 2) Provider component
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const didAttemptRefresh = useRef(false);
  const navigate = useNavigate();

  // On mount: try to rehydrate access token or perform one refresh
  useEffect(() => {
    // 1) If we already have an access token, bail out
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setIsAuthenticated(true);
      return;
    }

    // 2) Only try once
    if (didAttemptRefresh.current) {
      navigate("/signin");
      return;
    }
    didAttemptRefresh.current = true;

    // 3) If there’s no refresh cookie, skip the network call and go to signin
    const hasRefreshCookie = document.cookie
        .split(";")
        .some(c => c.trim().startsWith("refreshToken="));
    if (!hasRefreshCookie) {
      navigate("/signin");
      return;
    }

    // 4) Only now do we call the server
    API.post("/auth/refresh-token")
        .then(res => {
          const newToken = res.data.accessToken;
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            setIsAuthenticated(true);
          } else {
            navigate("/signin");
          }
        })
        .catch(() => {
          navigate("/signin");
        });
  }, [navigate]);

  // Expose login function
  const login = (token, rememberMe = false) => {
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem("accessToken", token);
    } else {
      sessionStorage.setItem("accessToken", token);
    }
  };

  // Expose logout function
  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    }
    setIsAuthenticated(false);
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    navigate("/signin");
  };

  // Provide context value
  return (
      <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
        {children}
      </AuthContext.Provider>
  );
}

// Custom hook for consuming the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
