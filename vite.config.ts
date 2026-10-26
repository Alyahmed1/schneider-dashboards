import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4727, strictPort: true },
  preview: { port: 4727, strictPort: true },
});
