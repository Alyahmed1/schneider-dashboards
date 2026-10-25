import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { EquipProvider } from "./Equip";
import { AlarmsProvider } from "./AlarmsContext";
import "./index.css";
import "./step2.css";
import "./step3.css";
import "./step4.css";
import "./step5.css";
import "./step6.css";
import "./step7.css";
import "./step8.css";
import "./step9.css";
import "./step10.css";
import "./step11.css";
import "./step12.css";
import "./step13.css";
import "./step14.css";
import "./theme.css";
import "./home.css";
import "./overview.css";
import "./maint.css";
import "./motion.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <EquipProvider>
        <AlarmsProvider>
          <App />
        </AlarmsProvider>
      </EquipProvider>
    </LiveProvider>
  </StrictMode>,
);
