docker pull johnakrause/scheduling-frontend:latest
docker pull johnakrause/scheduling-backend:latest
docker compose -f docker-compose.cloud.yml down
docker compose -f docker-compose.cloud.yml up -d
