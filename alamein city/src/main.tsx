import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LiveProvider } from "./live";
import { AlertProvider, FilterProvider, PriceProvider } from "./state";
import "./tokens.css";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LiveProvider>
      <FilterProvider>
        <PriceProvider>
          <AlertProvider>
            <App />
          </AlertProvider>
        </PriceProvider>
      </FilterProvider>
    </LiveProvider>
  </StrictMode>,
);
