import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { AlarmsProvider } from "./alarms";
import "./theme.css";
import "./agri.css";
import "./pumps.css";
import "./pivots.css";
import "./views.css";
import "./cover.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <AlarmsProvider>
        <App />
      </AlarmsProvider>
    </LiveProvider>
  </StrictMode>,
);
