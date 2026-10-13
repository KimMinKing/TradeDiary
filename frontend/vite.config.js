import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // sockjs-client v1.6 이 Node.js의 `global`을 참조 → 브라우저(ESM) 환경으로 매핑
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    // 개발 서버: /api 요청을 Spring Boot로 프록시 (CORS 없이 동작)
    proxy: {
      '^/api.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // WebSocket(STOMP/SockJS) → 백엔드로 프록시. SockJS는 /ws, /ws/info 등 하위 경로 사용
      '^/ws.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path,
      },
      '^/oauth2.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '^/login/oauth2.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
