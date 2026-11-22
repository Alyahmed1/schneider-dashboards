import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTheme, readTheme } from "./ui";
import "./theme.css";
import "./home.css";
import "./executive.css";
import "./cycle.css";
import "./ministry.css";

applyTheme(readTheme());
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
