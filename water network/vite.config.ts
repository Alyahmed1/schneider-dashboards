import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4729, strictPort: true },
  preview: { port: 4729, strictPort: true },
});
