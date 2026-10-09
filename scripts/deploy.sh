#!/bin/bash

# 배포 스크립트

echo "=== TradeDiary 배포 시작 ==="

# 1. Docker 이미지 빌드
echo "Docker 이미지 빌드 중..."
cd backend
docker build -t tradediary:latest .

# 2. Docker Hub에 푸시 (필요한 경우)
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
    echo "Docker Hub에 푸시 중..."
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
    docker tag tradediary:latest "$DOCKER_USERNAME/tradediary:latest"
    docker push "$DOCKER_USERNAME/tradediary:latest"
fi

# 3. 서버에 배포
echo "서버에 배포 중..."
if [ -n "$SERVER_IP" ]; then
    # Docker Hub에서 이미지를 풀해서 실행
    ssh "$SERVER_USERNAME@$SERVER_IP" << EOF
        cd /opt/tradediary
        docker-compose down
        docker-compose pull 2>/dev/null || true
        docker-compose up -d
        echo "배포 완료"
    EOF
else
    echo "SERVER_IP 환경변수를 설정해주세요"
fi

echo "=== 배포 완료 ==="