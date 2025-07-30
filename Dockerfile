# 使用Node.js官方镜像作为构建环境
FROM node:18-alpine as build-stage

WORKDIR /app

# 复制package相关文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 最终阶段 - 只保留构建产物
FROM alpine:latest
RUN mkdir -p /app/dist
COPY --from=build-stage /app/dist /app/dist
VOLUME ["/app/dist"]
CMD ["tail", "-f", "/dev/null"]