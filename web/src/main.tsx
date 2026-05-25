import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./modules/auth/AuthContext";
import { CampusProvider } from "./modules/campus/CampusContext";
import { installMockBackend } from "./lib/mockBackend";
import "./styles.css";

installMockBackend();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CampusProvider>
          <App />
        </CampusProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
