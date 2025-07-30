# API配置指南

## 📋 概述

本项目支持通过环境变量配置远程API接口地址，无需修改代码即可切换本地和远程服务。

## 🚀 快速配置

### 1. 创建环境配置文件

在项目根目录创建以下配置文件：

#### `.env` (基础配置)
```bash
# 基础环境配置
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_REQUEST_TIMEOUT=10000
```

#### `.env.development` (开发环境)
```bash
# 开发环境配置
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_REQUEST_TIMEOUT=10000
VITE_PROXY_TARGET=http://localhost:8000
```

#### `.env.production` (生产环境)
```bash
# 生产环境配置 - 修改为您的远程服务器IP
VITE_API_BASE_URL=http://YOUR_REMOTE_SERVER_IP:8000/api/v1
VITE_REQUEST_TIMEOUT=15000
```

#### `.env.local` (本地优先配置)
```bash
# 本地配置文件，优先级最高，不会被提交到Git
# 复制 .env.local.example 并修改为实际的远程IP

# 示例：使用IP地址
VITE_API_BASE_URL=http://192.168.1.100:8000/api/v1

# 示例：使用域名
# VITE_API_BASE_URL=https://api.yourdomain.com/api/v1

# 开发代理目标（开发环境专用）
VITE_PROXY_TARGET=http://192.168.1.100:8000

VITE_REQUEST_TIMEOUT=15000
```

### 2. 配置优先级

环境变量加载优先级（从高到低）：
1. `.env.local` - 本地配置，优先级最高
2. `.env.[mode]` - 模式特定配置（development/production）
3. `.env` - 通用配置

## 🔧 使用场景

### 场景1：开发环境连接本地服务
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 场景2：开发环境连接远程服务
```bash
# .env.local
VITE_API_BASE_URL=http://192.168.1.100:8000/api/v1
VITE_PROXY_TARGET=http://192.168.1.100:8000
```

### 场景3：生产环境部署
```bash
# .env.production
VITE_API_BASE_URL=https://api.production.com/api/v1
```

## 🛠 操作步骤

### 修改远程IP地址：

1. **创建 `.env.local` 文件**（推荐）
   ```bash
   VITE_API_BASE_URL=http://您的远程IP:8000/api/v1
   VITE_PROXY_TARGET=http://您的远程IP:8000
   ```

2. **重启开发服务器**
   ```bash
   npm run dev
   ```

3. **验证配置**
   - 打开浏览器开发者工具
   - 查看Network标签页，确认API请求指向正确的IP地址

## 📝 配置参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `VITE_API_BASE_URL` | API基础URL | `/api/v1` | `http://192.168.1.100:8000/api/v1` |
| `VITE_REQUEST_TIMEOUT` | 请求超时时间(ms) | `10000` | `15000` |
| `VITE_PROXY_TARGET` | 开发代理目标 | `http://0.0.0.0:8000` | `http://192.168.1.100:8000` |

## ⚠️ 注意事项

1. **文件安全**：`.env.local` 文件已被Git忽略，不会被提交到代码仓库
2. **重启要求**：修改环境变量后需要重启开发服务器
3. **CORS问题**：确保远程服务器配置了正确的CORS策略
4. **网络访问**：确保本地能够访问远程服务器的指定端口

## 🔍 故障排除

### API请求失败
1. 检查远程服务器是否启动
2. 检查网络连接
3. 检查防火墙设置
4. 验证API地址格式

### 环境变量未生效
1. 确认文件名正确（如 `.env.local`）
2. 重启开发服务器
3. 检查变量名拼写（必须以 `VITE_` 开头）

## 📚 更多信息

- [Vite环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Vue.js项目配置最佳实践](https://vuejs.org/guide/best-practices/production-deployment.html) 