import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [
    react(),
    remix({
      ignoredRouteFiles: ["**/*.test.*", "**/*.spec.*"],
      basename: "",
      future: {
        unstable_singleFetch: true
      }
    }),
  ],
  server: {
    port: Number(process.env.PORT || 5173),
    host: true
  },
  build: {
    sourcemap: true
  }
});
