import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: "/",
  plugins: [react()],
  // shown in the footer and Admin > About, so support can tell which build a user runs
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5174,
    proxy: {
      // the C# API (backend/Ellp.Api). Only used when VITE_USE_DEMO=false.
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:5220",
        changeOrigin: true,
      },
    },
  },
}));
