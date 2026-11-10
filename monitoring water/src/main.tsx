import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";
import "./detail.css";
import "./overview.css";
import "./dialogs.css";
import "./alarms.css";
import "./controls.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
