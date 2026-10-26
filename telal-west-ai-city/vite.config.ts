import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4728, strictPort: true },
  preview: { port: 4728, strictPort: true },
  build: {
    rollupOptions: {
      // the big libraries get their own files, so they are cached across releases and load in parallel
      output: { manualChunks: { react: ["react", "react-dom"], charts: ["recharts"], motion: ["framer-motion"] } },
    },
  },
});
