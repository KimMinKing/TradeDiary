# [파일 용도] React 프론트엔드 Docker 이미지 빌드 (nginx로 서빙)

# ── 1단계: Node.js 빌드 ───────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 캐시 최적화
COPY package*.json ./
RUN npm install

COPY . .

# Docker 환경에서는 VITE_API_URL 비워두면 nginx가 /api를 백엔드로 프록시함
RUN npm run build

# ── 2단계: nginx로 정적 파일 서빙 ────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
