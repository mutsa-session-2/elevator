import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    proxy: {
      // ✅ 기존: /api/* -> 백엔드 프록시
      "/api": {
        target: "https://app.floorida.site",
        changeOrigin: true,
        secure: true,
      },

      // ✅ 추가: /teams/* -> 백엔드 프록시 (게시판이 이 경로를 씀)
      "/teams": {
        target: "https://app.floorida.site",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
