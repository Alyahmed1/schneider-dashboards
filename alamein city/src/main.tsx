import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { AlertProvider, FilterProvider } from "./state";
import "./tokens.css";
import "./app.css";
import "./maps.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <FilterProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </FilterProvider>
    </LiveProvider>
  </StrictMode>,
);
