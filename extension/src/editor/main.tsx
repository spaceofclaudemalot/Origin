import React from "react";
import { createRoot } from "react-dom/client";
import { EditorApp } from "./EditorApp";
import { ToastProvider } from "./Toast";
import "./editor.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <EditorApp />
    </ToastProvider>
  </React.StrictMode>,
);
