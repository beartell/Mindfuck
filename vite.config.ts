import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
// https://v2.tauri.app/start/create-project/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Path aliases for clean imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  // Tauri expects a fixed port
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
