import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 서버: /api 요청을 Spring Boot로 프록시 (CORS 없이 동작)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
