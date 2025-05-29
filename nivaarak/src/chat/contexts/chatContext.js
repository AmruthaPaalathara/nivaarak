
import React, { createContext, useContext, useReducer, useEffect } from "react";

const initialState = {
  messages: [],
  documentId: null,
  documentName: null,
  loading: false,
  error: null,
  uploadProgress: 0,
  lastActivity: Date.now(),
};

//  Ensure `ChatContext` is initialized before exporting
const ChatContext = createContext({
  state: initialState,
  dispatch: () => {}
});

const chatReducer = (state, action) => {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload], lastActivity: Date.now() };
    case "SET_DOCUMENT":
      return {
        ...state,
        documentId: action.payload.documentId,
        documentName: action.payload.documentName,
        lastActivity: Date.now(),
      };
    case "CLEAR_DOCUMENT":
      return { ...state, documentId: null, documentName: null, lastActivity: Date.now() };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_UPLOAD_PROGRESS":
      return { ...state, uploadProgress: action.payload };
    case "UPDATE_ACTIVITY":
      return { ...state, lastActivity: Date.now() };
    default:
      return state;
  }
};

// ✅ Export ChatContext and ChatProvider
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - state.lastActivity > 30 * 60 * 1000) {
        dispatch({ type: "CLEAR_DOCUMENT" });
        dispatch({ type: "SET_ERROR", payload: "Session expired. Please start a new conversation." });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [state.lastActivity]);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;