import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: https://aba-geomdan.github.io/esdm/ 로 배포하므로 base = "/esdm/"
// 저장소 이름을 바꾸면 이 값도 같이 바꿔야 함.
export default defineConfig({
  plugins: [react()],
  base: "/esdm/",
});
