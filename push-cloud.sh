# /bin/bash

docker build -f internal/Dockerfile.internal -t johnakrause/scheduling-backend:latest .
docker build -f frontend/Dockerfile.frontend -t johnakrause/scheduling-frontend:latest ./frontend
docker push johnakrause/scheduling-frontend:latest
docker push johnakrause/scheduling-backend:latest
