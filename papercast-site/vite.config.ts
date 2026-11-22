import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    proxy: {
      // 本地功能测试：代理到 papercast-poc/scripts/serve_local.py（127.0.0.1:8000）
      "/api": "http://127.0.0.1:8000",
      "/audio": "http://127.0.0.1:8000",
    },
  },
});