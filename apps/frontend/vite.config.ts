// apps/frontend/vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    // 1. TanStack Router 最新写法，开启自动代码分割
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    // 2. Tailwind CSS v4 现在的接入方式，取代了原先的 postcss
    tailwindcss(),
    // 3. React 支持
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
})
