# [파일 용도] Spring Boot 백엔드 Docker 이미지 빌드

# ── 1단계: Gradle 빌드 ───────────────────────────────────────────────
FROM gradle:8-jdk17 AS build

WORKDIR /app

# 의존성 캐시 최적화: 소스 변경 없으면 gradle 재다운로드 안 함
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon || true

COPY src ./src
RUN gradle bootJar --no-daemon -x test

# ── 2단계: 실행 이미지 (JRE만 포함, 용량 최소화) ─────────────────────
FROM eclipse-temurin:17-jre

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent http://localhost:8080/api/health >/dev/null || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
