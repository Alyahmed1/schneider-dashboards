import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { WorkOrdersProvider } from "./workorders";
import "./tokens.css";
import "./base.css";
import "./home.css";
import "./kpi.css";
import "./plan.css";
import "./mobility.css";
import "./utilities.css";
import "./export.css";
import "./phase4.css";
import "./motion.css";
import "./polish.css";
import "./fit.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <WorkOrdersProvider>
        <App />
      </WorkOrdersProvider>
    </LiveProvider>
  </StrictMode>,
);
