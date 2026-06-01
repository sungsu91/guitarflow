import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import DesktopLayout from "./layouts/DesktopLayout.jsx";
import "./style.css";
import "./components/brand-header.css";
import "./layouts/desktop-layout.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DesktopLayout>
      <App />
    </DesktopLayout>
  </React.StrictMode>,
);
