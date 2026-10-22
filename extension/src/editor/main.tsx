import React from "react";
import { createRoot } from "react-dom/client";
import { EditorApp } from "./EditorApp";
import { ToastProvider } from "./Toast";
import { initLang } from "../i18n";
import "./editor.css";
import "./print.css";

initLang();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <EditorApp />
    </ToastProvider>
  </React.StrictMode>,
);
