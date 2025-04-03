import React from "react";
import ReactDOM from "react-dom/client";  // ✅ Correct import for React 18+
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext"; // ✅ Ensure correct path

const root = ReactDOM.createRoot(document.getElementById("root")); // ✅ Use `createRoot`
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
