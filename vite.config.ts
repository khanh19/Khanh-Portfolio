import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Don't bake small images (logos, icons) into the JS as base64: they're
    // lazy-loaded far down the page, so the first download stays lean.
    assetsInlineLimit: 0,
  },
});
