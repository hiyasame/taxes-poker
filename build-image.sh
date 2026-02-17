docker rmi arcticrain/poker-backend
docker rmi arcticrain/poker-frontend

docker build --platform linux/amd64 -t arcticrain/poker-backend ./backend
docker build --platform linux/amd64 -t arcticrain/poker-frontend ./frontend

docker push arcticrain/poker-backend
docker push arcticrain/poker-frontend