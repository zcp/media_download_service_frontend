# 部署配置说明

## 配置文件管理

所有的URL配置都通过 `config/env.js` 文件进行管理，支持不同环境的快速切换。

### 文件结构

```
config/
├── env.js           # 当前环境配置（运行时使用）
├── env.prod.js      # 生产环境配置示例
└── (可扩展其他环境配置文件)
```

### 配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `VITE_BASE_API_URL` | 媒体下载服务后端API地址 | `http://124.220.235.226:8001/` |
| `VITE_AUTH_API_URL` | 用户认证服务地址 | `http://124.220.235.226:8002/` |
| `VITE_LOGIN_URL` | 用户登录页面地址 | `http://124.220.235.226:5173/pages/auth/login` |
| `VITE_API_TIMEOUT` | API请求超时时间（毫秒） | `30000` |
| `VITE_POLLING_INTERVAL` | 轮询间隔时间（毫秒） | `5000` |
| `VITE_WS_URL` | WebSocket连接地址（可选） | `ws://124.220.235.226:8001/ws` |

## 部署步骤

### 1. 本地开发环境

直接修改 `config/env.js` 中的配置值：

```javascript
export const ENV_CONFIG = {
  VITE_BASE_API_URL: 'http://localhost:8001/',
  VITE_LOGIN_URL: 'http://localhost:5173/pages/auth/login',
  // ... 其他配置
};
```

### 2. 生产环境部署

#### 方式一：替换配置文件
```bash
# 使用生产环境配置
cp config/env.prod.js config/env.js

# 或者直接修改 config/env.js 中的IP地址
```

#### 方式二：Docker 部署
```dockerfile
# 在Dockerfile中替换配置文件
COPY config/env.prod.js /app/config/env.js

# 或者通过挂载方式
# docker run -v ./config/env.prod.js:/app/config/env.js
```

### 3. 验证配置

启动应用后，可以通过浏览器开发者工具检查：

```javascript
// 在控制台中查看加载的配置
console.log(window.__ENV);
```

## 重要注意事项

1. **严禁硬编码：** 所有代码中已移除硬编码的URL，请勿在业务代码中重新添加
2. **配置生效：** 修改配置文件后需要重新构建或刷新页面
3. **安全考虑：** 生产环境配置文件不应包含敏感信息
4. **备份配置：** 建议为每个环境维护独立的配置文件

## 常见问题

### Q: 修改配置后不生效？
A: 确保 `index.html` 中正确引入了 `config/env.js`，且在 `main.js` 之前。

### Q: API请求失败？
A: 检查 `VITE_BASE_API_URL` 配置是否正确，确保后端服务可访问。

### Q: 登录跳转异常？
A: 验证 `VITE_LOGIN_URL` 配置是否指向正确的用户登录页面。

### Q: 如何支持HTTPS？
A: 将配置中的 `http://` 修改为 `https://`，并确保后端支持HTTPS。
