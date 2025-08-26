# 媒体下载服务前端代码生成提示词完善方案

## 一、需要新增的完善点

### 1. simple-callback.html 页面规范
**完善位置：** "项目目录结构" 和 "环境配置与URL管理" 部分

**当前问题：**
- 文档中没有提及 `simple-callback.html` 页面
- 缺少外部回调处理的中间页面设计

**需要添加的内容：**

#### 1.1 项目目录结构补充
```
├── public/
│   └── simple-callback.html    # 外部登录回调处理页面
├── src/
│   ├── components/
│   │   ├── AuthCallback.vue    # Vue 路由回调组件
│   │   └── ...
```

#### 1.2 simple-callback.html 页面设计规范
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录处理中...</title>
    <style>
        /* 美观的加载样式 */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div class="status">正在处理登录...</div>
        <div class="details">请稍候，正在验证您的登录信息</div>
    </div>

    <script>
        // Token处理逻辑
        function processCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            
            if (token) {
                // 跳转到Vue应用的认证回调路由
                const callbackUrl = `${window.location.origin}/auth/callback?token=${encodeURIComponent(token)}`;
                console.log('🔄 跳转到Vue应用回调:', callbackUrl);
                window.location.href = callbackUrl;
            } else {
                console.error('❌ 未找到Token参数');
                document.querySelector('.status').textContent = '登录失败';
                document.querySelector('.details').textContent = '未找到访问令牌';
            }
        }
        
        // 页面加载后立即处理
        document.addEventListener('DOMContentLoaded', processCallback);
    </script>
</body>
</html>
```

### 2. AuthCallback.vue 组件完善
**完善位置：** "四、界面设计与路由规划" 部分

**当前问题：**
- 路由规划中缺少 `/auth/callback` 路由
- 没有专门的认证回调组件设计

**需要添加的内容：**

#### 2.1 路由规划补充
```typescript
// 在路由配置中添加
const routes = [
  // 现有路由...
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/components/AuthCallback.vue'),
    meta: {
      title: '登录处理中',
      requiresAuth: false  // 此路由不需要认证
    }
  }
];
```

#### 2.2 AuthCallback.vue 组件设计规范
```vue
<template>
  <div class="auth-callback">
    <div class="loading-container">
      <el-loading :visible="true" text="登录处理中..." />
      <div class="status-text">
        <p v-if="status === 'processing'">正在处理登录信息...</p>
        <p v-else-if="status === 'success'">登录成功，正在跳转...</p>
        <p v-else-if="status === 'error'">登录失败：{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// 组件逻辑：
// 1. 从URL获取Token
// 2. 验证Token有效性
// 3. 保存到Auth Store
// 4. 获取重定向路径并跳转
</script>
```

### 3. 路由守卫增强
**完善位置：** "4.2. 路由守卫配置" 部分

**当前问题：**
- 路由守卫逻辑不完整，缺少跨域回调处理
- 重定向逻辑使用硬编码URL

**需要完善的内容：**

#### 3.1 增强路由守卫逻辑
```typescript
// 更完整的路由守卫实现
import { LOGIN_URL } from '@/constants/api';

router.beforeEach(async (to, from, next) => {
  console.log(`路由导航: ${from.path} -> ${to.path}`);
  
  // 更新页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 媒体下载服务`;
  }
  
  // 检查是否需要认证
  const requiresAuth = to.meta?.requiresAuth || isProtectedRoute(to.path);
  
  if (requiresAuth) {
    const authStore = useAuthStore();
    
    console.log('检查认证状态...');
    
    // 检查Token是否存在
    const savedToken = localStorage.getItem('jwt_token');
    if (!savedToken) {
      console.log('未找到Token，跳转登录');
      authStore.setRedirectPath(to.fullPath);
      
      // 保存原始路径到localStorage
      localStorage.setItem('auth_redirect_path', to.fullPath);
      
      // 使用简化参数避免URL编码问题
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originDomain}`;
      
      console.log('跳转登录，原始路径:', to.fullPath);
      console.log('回调域名:', originDomain);
      window.location.href = loginUrlWithCallback;
      return;
    }
    
    // 检查Token是否有效
    if (!isTokenValid(savedToken)) {
      console.log('Token已过期，跳转登录');
      authStore.clearAuth();
      authStore.setRedirectPath(to.fullPath);
      
      // 保存原始路径到localStorage
      localStorage.setItem('auth_redirect_path', to.fullPath);
      
      // 使用简化参数避免URL编码问题
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originDomain}`;
      
      console.log('Token过期，跳转登录，原始路径:', to.fullPath);
      console.log('回调域名:', originDomain);
      window.location.href = loginUrlWithCallback;
      return;
    }
    
    // Token有效，确保store中的认证状态正确
    if (!authStore.isAuthenticated) {
      console.log('恢复认证状态...');
      const success = authStore.setToken(savedToken);
      if (!success) {
        console.error('恢复认证状态失败');
        authStore.forceReauth(to.fullPath);
        return;
      }
    }
    
    console.log('认证检查通过');
    authStore.isAuthenticated = true;
  }
  
  next();
});
```

### 4. 认证Store设计完善
**完善位置：** "5.1.1. 认证Store设计" 部分

**当前问题：**
- Auth Store 没有处理跨域回调的相关方法
- 缺少重定向路径管理的完整实现

**需要添加的内容：**

#### 4.1 Auth Store 方法补充
```typescript
// stores/auth.js 中添加的方法
actions: {
  // 现有方法...
  
  /**
   * 设置重定向路径
   */
  setRedirectPath(path) {
    this.redirectPath = path;
    localStorage.setItem('auth_redirect_path', path);
  },
  
  /**
   * 获取重定向路径
   */
  getRedirectPath() {
    return this.redirectPath || localStorage.getItem('auth_redirect_path');
  },
  
  /**
   * 清除重定向路径
   */
  clearRedirectPath() {
    this.redirectPath = null;
    localStorage.removeItem('auth_redirect_path');
  },
  
  /**
   * 处理认证后的重定向
   */
  handleAuthRedirect() {
    const redirectPath = this.getRedirectPath();
    
    if (redirectPath && redirectPath !== '/login') {
      console.log('重定向到:', redirectPath);
      this.clearRedirectPath();
      
      // 使用router实例进行导航
      const router = this.$router || window.$router;
      if (router) {
        router.push(redirectPath);
      } else {
        // 降级方案：直接修改location
        window.location.href = redirectPath;
      }
    } else {
      console.log('重定向到默认页面');
      
      const router = this.$router || window.$router;
      if (router) {
        router.push('/download-center/tasks');
      } else {
        window.location.href = '/download-center/tasks';
      }
    }
  },
  
  /**
   * 强制重新认证
   */
  forceReauth(targetPath) {
    this.clearAuth();
    this.setRedirectPath(targetPath);
    
    import('@/constants/api').then(({ LOGIN_URL }) => {
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originDomain}`;
      window.location.href = loginUrlWithCallback;
    });
  }
}
```

### 5. API请求拦截器完善
**完善位置：** "5.2.1. HTTP拦截器配置" 部分

**当前问题：**
- 响应拦截器中的重定向逻辑使用硬编码
- 缺少跨域认证失败的处理机制

**需要修改的内容：**

#### 5.1 响应拦截器优化
```javascript
// 响应拦截器 - 处理认证失败
import { LOGIN_URL } from '@/constants/api';

request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      
      // 清除认证状态
      authStore.clearAuth();
      
      // 保存当前路径
      const currentPath = window.location.pathname;
      authStore.setRedirectPath(currentPath);
      
      // 跳转到外部登录页面
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originDomain}`;
      
      console.log('API认证失败，跳转登录');
      window.location.href = loginUrlWithCallback;
    }
    return Promise.reject(error);
  }
);
```

### 6. 环境配置管理完善
**完善位置：** "环境配置与URL管理" 部分

**当前问题：**
- 配置文件中缺少用户服务的登录URL配置
- 没有跨服务回调的相关配置项

**需要添加的内容：**

#### 6.1 config/env.js 配置补充
```javascript
// config/env.js 中添加
export const ENV_CONFIG = {
  // 现有配置...
  
  // ===== 用户认证服务配置 =====
  VITE_AUTH_API_URL: 'http://124.220.235.226:8002/',
  VITE_LOGIN_URL: 'http://124.220.235.226:5173/pages/auth/login',
  
  // ===== 跨服务回调配置 =====
  VITE_CALLBACK_PATH: '/simple-callback.html',
  VITE_AUTH_CALLBACK_PATH: '/auth/callback',
  
  // ===== 其他配置 =====
  VITE_APP_TITLE: '媒体下载服务',
  VITE_API_TIMEOUT: '30000',
  VITE_POLLING_INTERVAL: '5000',
};
```

#### 6.2 constants/api.js 常量补充
```javascript
// constants/api.js 中添加
// 用户认证服务API地址
export const AUTH_API_URL = (
  getEnv('VITE_AUTH_API_URL') || 'http://localhost:8002/'
).replace(/\/?$/, '/');

// 用户登录页面地址
export const LOGIN_URL = 
  getEnv('VITE_LOGIN_URL') || 
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/pages/auth/login` : '');

// 回调路径配置
export const CALLBACK_PATH = getEnv('VITE_CALLBACK_PATH') || '/simple-callback.html';
export const AUTH_CALLBACK_PATH = getEnv('VITE_AUTH_CALLBACK_PATH') || '/auth/callback';
```

### 7. 安全性考虑完善
**完善位置：** "十一、认证与安全" 部分

**当前问题：**
- 缺少跨域认证的安全策略
- 没有Token传递的安全措施

**需要添加的内容：**

#### 7.1 跨域安全策略
```typescript
// 域名白名单验证
export function validateOrigin(origin: string): boolean {
  const allowedOrigins = [
    'localhost:3000', 'localhost:3001', 'localhost:8080',
    '127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:8080',
    // 生产环境域名
    'media-download.yourdomain.com',
    'user-service.yourdomain.com'
  ];
  
  return allowedOrigins.includes(origin);
}

// Token传递安全检查
export function validateToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // 检查JWT格式
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // 验证payload格式
    const payload = JSON.parse(atob(parts[1]));
    return !!(payload.user_id && payload.exp);
  } catch {
    return false;
  }
}
```

## 二、文档结构调整建议

### 1. 新增专门章节

#### "跨服务认证集成"
- 外部认证回调处理流程
- simple-callback.html 页面设计
- AuthCallback.vue 组件设计
- 跨域安全策略

#### "认证回调流程"
- 完整的认证流程图
- 各个环节的错误处理
- 调试和监控建议

### 2. 现有章节增强

#### "路由规划"
- 添加 `/auth/callback` 路由
- 完善路由守卫逻辑

#### "认证Store设计"
- 添加重定向路径管理
- 添加跨域认证处理

#### "HTTP拦截器配置"
- 完善401错误处理
- 添加跨域重定向逻辑

#### "环境配置与URL管理"
- 添加用户服务配置
- 添加回调路径配置

## 三、重要约束补充

### 1. 跨域认证约束
- 必须使用简化参数避免URL编码问题
- 必须实现域名白名单验证
- 必须使用localStorage保存重定向路径

### 2. 安全性约束
- Token传递必须使用HTTPS（生产环境）
- 必须验证Token格式和内容
- 必须实现超时和错误处理

### 3. 用户体验约束
- 认证过程必须有加载状态提示
- 认证失败必须有友好错误提示
- 必须支持登录后自动跳转回原页面

## 四、测试策略补充

### 1. 跨服务认证测试
- 外部跳转功能测试
- Token传递和验证测试
- 重定向路径保存和恢复测试

### 2. 安全性测试
- 域名白名单验证测试
- 非法Token处理测试
- 超时和网络异常测试

### 3. 用户体验测试
- 完整认证流程体验测试
- 错误处理和提示测试
- 不同浏览器兼容性测试
