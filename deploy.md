# 서버 배포 명령어

## 1. Docker Compose v2 설치

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
```

```bash
sudo wget -O /usr/local/lib/docker/cli-plugins/docker-compose https://github.com/docker/compose/releases/download/v2.36.1/docker-compose-linux-x86_64
```

```bash
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

```bash
docker compose version
```

## 2. 배포

```bash
cd ~/tradediary
```

```bash
git pull origin main
```

```bash
docker compose up -d --build
```

## 3. 확인

```bash
docker compose ps
```

```bash
docker compose logs --tail=50 backend
```
