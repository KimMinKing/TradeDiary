#!/bin/bash

# Oracle Cloud에 배포하는 간단한 스크립트

echo "=== TradeDiary 배포 (간단 버전) ==="

# 1. Docker 이미지 빌드
echo "1. Docker 이미지 빌드 중..."
cd backend
docker build -t tradediary:latest .

# 2. Oracle Cloud로 파일 전송 (scp)
echo "2. Oracle Cloud로 파일 전송 중..."
scp -i ~/.ssh/your-key.pem \
    docker-compose.yml \
    docker-compose.prod.yml \
    $ORACLE_USER@$ORACLE_HOST:/opt/tradediary/

# 3. 원격으로 배포 실행
echo "3. Oracle Cloud에서 배포 실행..."
ssh -i ~/.ssh/your-key.pem $ORACLE_USER@$ORACLE_HOST << 'EOF'
    cd /opt/tradediary
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    echo "배포 완료!"
EOF

echo "=== 모든 배포 완료 ==="