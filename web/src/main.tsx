import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./modules/auth/AuthContext";
import { CampusProvider } from "./modules/campus/CampusContext";
import { ToastProvider } from "./components/ToastContext";
import { ThemeProvider } from "./modules/theme/ThemeContext";
import "./i18n";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CampusProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CampusProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
