import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { StoreProvider } from "./store";
import "./app.css";
import "./fit.css";
import "./alarms.css";
import "./account.css";
import "./assistant.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </LiveProvider>
  </StrictMode>,
);
