import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4750, strictPort: true },
  preview: { port: 4750, strictPort: true },
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ["react", "react-dom"], charts: ["recharts"], motion: ["framer-motion"] } },
    },
  },
});
