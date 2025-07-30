# 媒体下载服务前端

基于Vue 3 + Vite构建的媒体下载服务前端应用，支持通过配置文件灵活切换本地和远程API服务。

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## 🚀 快速开始

### 1. 安装依赖

```sh
npm install
```

### 2. 配置API地址

复制环境变量示例文件并配置远程服务器地址：

```sh
# 复制配置示例
cp env.example .env.local

# 编辑配置文件，修改为您的远程服务器IP
# VITE_API_BASE_URL=http://您的远程IP:8000/api/v1
```

详细配置说明请查看：[API配置指南](./docs/API配置指南.md)

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## 📝 配置远程API (重要)

如果您需要连接远程服务器而不是本地服务，请按以下步骤操作：

1. **创建配置文件**
   ```sh
   cp env.example .env.local
   ```

2. **修改API地址**
   编辑 `.env.local` 文件：
   ```bash
   VITE_API_BASE_URL=http://您的远程IP:8000/api/v1
   VITE_PROXY_TARGET=http://您的远程IP:8000
   ```

3. **重启开发服务器**
   ```sh
   npm run dev
   ```

更多配置选项请参考：[API配置指南](./docs/API配置指南.md)
