import React, { createContext, useContext, useReducer, useEffect } from "react";

const ErrorContext = createContext();

// Constants for error types
const ADD_ERROR = "ADD_ERROR";
const REMOVE_ERROR = "REMOVE_ERROR";

const errorReducer = (state, action) => {
  switch (action.type) {
    case ADD_ERROR:
      return [...state, action.payload];
    case REMOVE_ERROR:
      return state.filter((_, i) => i !== action.payload);
    default:
      return state;
  }
};

// Custom hook to consume the error context
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [errors, dispatch] = useReducer(errorReducer, []);

  // Function to report an error
  const reportError = (error) => {
    const errorPayload = {
      message: error.message || "An unknown error occurred",
      timestamp: new Date().toISOString(),
      severity: error.severity || "error", // Optional: Add severity level
    };

    dispatch({ type: ADD_ERROR, payload: errorPayload });

    // Automatically remove the error after 5 seconds
    setTimeout(() => {
      dispatch({ type: REMOVE_ERROR, payload: errors.length });
    }, 5000);
  };

  return (
    <ErrorContext.Provider value={{ errors, reportError }}>
      {children}
    </ErrorContext.Provider>
  );
};