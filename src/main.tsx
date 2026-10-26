import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import "./tokens.css";
import "./base.css";
import "./home.css";
import "./plan.css";
import "./mobility.css";
import "./motion.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <App />
    </LiveProvider>
  </StrictMode>,
);
