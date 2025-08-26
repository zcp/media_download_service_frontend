# 跨服务SSO认证完整改进方案

## 📋 **总体需求回顾**

**核心需求：** 当其他功能模块的前端被访问时，需要主动检测用户是否登入，如果没有登录就自动跳转到user模块进行登录，登入成功之后就跳转回来。

**完整流程：**
1. 访问 `localhost:3000/download-center`
2. 跳转到 `localhost:5173/pages/auth/login?external_callback=true&origin=localhost:3000`
3. 应该看到 "🔗 来自外部应用的登录请求" 提示
4. 点击 Google 登录
5. 登录成功后应该跳转到 `localhost:3000/simple-callback.html?token=xxx`
6. 最终跳转到 `localhost:3000/download-center`

## 🔧 **两个文档的具体修改方案**

### 一、用户模块前端代码生成提示词文档修改

#### 1.1 在 "后端API服务器基础URL" 章节添加

**位置：** 第8行后面添加

```markdown
### 跨服务SSO集成配置

**外部应用回调支持：**
- 支持来自其他服务前端的SSO登录请求
- 通过URL参数 `external_callback=true&origin=<domain>` 识别外部应用
- 登录成功后自动跳转回外部应用

**安全域名管理：**
- 必须在环境配置中维护允许的外部应用域名白名单
- 禁止跳转到未授权的域名，防止恶意重定向攻击
```

#### 1.2 在 "环境变量配置" 章节补充

**位置：** 第41行 `ENV_CONFIG` 对象中添加

```javascript
// ===== 跨服务SSO配置 =====
// 允许的外部回调域名列表（安全控制）
VITE_ALLOWED_ORIGINS: 'localhost:3000,localhost:3001,localhost:8080,127.0.0.1:3000,127.0.0.1:3001',

// 外部应用回调页面路径
VITE_EXTERNAL_CALLBACK_PATH: '/simple-callback.html',

// 是否启用外部应用回调功能
VITE_ENABLE_EXTERNAL_CALLBACK: 'true',
```

#### 1.3 在 "constants/api.ts" 示例中添加

**位置：** 第22行后面添加

```typescript
// 跨服务SSO配置常量
export const ALLOWED_ORIGINS: string[] = (
  getEnv('VITE_ALLOWED_ORIGINS') || 'localhost:3000'
).split(',').map(s => s.trim());

export const EXTERNAL_CALLBACK_PATH: string = 
  getEnv('VITE_EXTERNAL_CALLBACK_PATH') || '/simple-callback.html';

export const ENABLE_EXTERNAL_CALLBACK: boolean = 
  getEnv('VITE_ENABLE_EXTERNAL_CALLBACK') === 'true';
```

#### 1.4 新增 "跨服务SSO集成实现" 章节

**位置：** 在现有页面设计章节前添加

```markdown
## 跨服务SSO集成实现

### 外部应用登录检测

在 `pages/auth/login.vue` 页面中必须实现以下功能：

#### 1. URL参数检测
```typescript
import { onMounted } from 'vue'

const isExternalLogin = ref(false)

// 获取URL参数的函数
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    external_callback: urlParams.get('external_callback') === 'true',
    origin: urlParams.get('origin'),
  }
}

onMounted(() => {
  const urlParams = getUrlParams()
  
  if (urlParams.external_callback && urlParams.origin) {
    console.log('🎯 检测到外部应用登录请求，来源:', urlParams.origin)
    isExternalLogin.value = true
    
    // 显示外部应用登录提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    })
  }
})
```

#### 2. 外部登录UI提示
```vue
<!-- 在登录表单前添加外部登录提示 -->
<view v-if="isExternalLogin" class="external-login-notice">
  <text class="notice-text">🔗 来自外部应用的登录请求</text>
  <text class="notice-desc">登录成功后将自动跳转回应用</text>
</view>
```

#### 3. 外部回调处理函数
```typescript
// 处理外部应用回调的核心函数
function handleExternalCallback(token: string, userInfo: any = null): boolean {
  const urlParams = getUrlParams()
  
  if (!urlParams.external_callback || !urlParams.origin) {
    return false // 不是外部回调请求
  }
  
  // 安全检查：验证域名是否在白名单中
  import('@/constants/api').then(({ ALLOWED_ORIGINS }) => {
    if (!ALLOWED_ORIGINS.includes(urlParams.origin)) {
      console.error('❌ 不允许的来源域名:', urlParams.origin)
      uni.showToast({
        title: '不允许的来源',
        icon: 'error'
      })
      return false
    }
    
    // 构建回调URL
    const protocol = urlParams.origin.includes('localhost') || urlParams.origin.includes('127.0.0.1') ? 'http' : 'https'
    const callbackUrl = `${protocol}://${urlParams.origin}/simple-callback.html?token=${encodeURIComponent(token)}`
    
    console.log('🚀 跳转到外部应用:', callbackUrl)
    uni.showToast({ title: '登录成功，正在跳转...', icon: 'success' })
    
    setTimeout(() => {
      // #ifdef H5
      window.location.href = callbackUrl
      // #endif
    }, 1000)
  })
  
  return true // 已处理外部回调
}
```

#### 4. 修改登录成功处理逻辑

在所有登录方式的成功处理中添加外部回调检查：

```typescript
// 用户名密码登录成功后
async function onLoginSuccess(loginResult: any) {
  // 原有的Token保存逻辑...
  
  // 检查是否需要处理外部回调
  const isExternalCallback = handleExternalCallback(loginResult.access_token, loginResult.userInfo)
  
  if (!isExternalCallback) {
    // 原来的内部跳转逻辑
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

// 第三方登录函数修改
async function handleGoogleLogin() {
  const urlParams = getUrlParams()
  if (urlParams.external_callback && urlParams.origin) {
    uni.setStorageSync('external_callback', true)
    uni.setStorageSync('external_origin', urlParams.origin)
  }
  
  // 原有的登录逻辑...
}
```

#### 5. 第三方登录回调处理

在 `pages/auth/callback.vue` 中添加外部回调处理：

```typescript
// 第三方登录成功后的处理
function handleThirdPartyLoginSuccess(loginResult: any) {
  // 原有的Token保存逻辑...
  
  // 检查是否有外部回调
  const isExternalCallback = uni.getStorageSync('external_callback')
  const externalOrigin = uni.getStorageSync('external_origin')
  
  if (isExternalCallback && externalOrigin) {
    // 清除存储的信息
    uni.removeStorageSync('external_callback')
    uni.removeStorageSync('external_origin')
    
    // 验证域名安全性
    import('@/constants/api').then(({ ALLOWED_ORIGINS }) => {
      if (!ALLOWED_ORIGINS.includes(externalOrigin)) {
        console.error('❌ 不允许的来源域名:', externalOrigin)
        return
      }
      
      // 跳转到外部应用
      const protocol = externalOrigin.includes('localhost') ? 'http' : 'https'
      const callbackUrl = `${protocol}://${externalOrigin}/simple-callback.html?token=${encodeURIComponent(loginResult.access_token)}`
      
      setTimeout(() => {
        // #ifdef H5
        window.location.href = callbackUrl
        // #endif
      }, 1000)
    })
    
    return // 阻止默认跳转
  }
  
  // 原有的内部跳转逻辑...
}
```

### 安全注意事项

1. **域名白名单验证**：必须严格验证 `origin` 参数，只允许预设的域名
2. **Token安全传递**：使用URL参数传递Token时确保HTTPS环境
3. **错误处理**：对于无效的域名或参数，应该显示友好的错误提示
4. **日志记录**：记录所有外部回调请求，便于安全审计
```

### 二、媒体下载服务前端代码生成提示词文档修改

#### 2.1 在 "项目目录结构" 章节补充

**位置：** 第44行项目目录结构中添加

```
├── public/
│   └── simple-callback.html    # 外部登录回调处理页面
├── src/
│   ├── components/
│   │   ├── AuthCallback.vue    # Vue 路由回调组件
```

#### 2.2 在 "环境配置与URL管理" 章节补充

**位置：** 第82行 `ENV_CONFIG` 对象中添加

```javascript
// ===== 用户认证服务配置 =====
VITE_AUTH_API_URL: 'http://124.220.235.226:8002/',
VITE_LOGIN_URL: 'http://124.220.235.226:5173/pages/auth/login',

// ===== 跨服务回调配置 =====
VITE_CALLBACK_PATH: '/simple-callback.html',
VITE_AUTH_CALLBACK_PATH: '/auth/callback',
```

#### 2.3 在 "constants/api.js" 章节补充

**位置：** 第141行后面添加

```javascript
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

#### 2.4 新增 "跨服务认证集成" 章节

**位置：** 在 "四、界面设计与路由规划" 前添加

```markdown
## 三、跨服务认证集成

### 3.1 外部登录回调页面设计

#### simple-callback.html 页面规范

必须在 `public` 目录下创建 `simple-callback.html` 文件，用于处理来自用户服务的登录回调：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录处理中...</title>
    <style>
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
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
        .status {
            font-size: 18px;
            margin-bottom: 10px;
        }
        .details {
            font-size: 14px;
            opacity: 0.8;
        }
        .error {
            color: #ff6b6b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner" id="spinner"></div>
        <div class="status" id="status">正在处理登录...</div>
        <div class="details" id="details">请稍候，正在验证您的登录信息</div>
    </div>

    <script>
        // 从URL获取参数的函数
        function getUrlParams() {
            const params = new URLSearchParams(window.location.search);
            return {
                token: params.get('token'),
                user: params.get('user'),
                error: params.get('error'),
                error_description: params.get('error_description')
            };
        }
        
        // 更新UI状态
        function updateStatus(status, details, isError = false) {
            document.getElementById('status').textContent = status;
            document.getElementById('details').textContent = details;
            
            if (isError) {
                document.getElementById('status').className = 'status error';
                document.getElementById('spinner').style.display = 'none';
            }
        }
        
        // 主处理逻辑
        async function processCallback() {
            try {
                const params = getUrlParams();
                console.log('📋 接收到的参数:', params);
                
                // 检查是否有错误
                if (params.error) {
                    throw new Error(params.error_description || params.error);
                }
                
                // 获取token
                const token = params.token;
                if (!token) {
                    throw new Error('未找到访问令牌');
                }
                
                console.log('🎫 获取到Token:', token.substring(0, 20) + '...');
                updateStatus('验证令牌...', '正在验证访问令牌的有效性');
                
                // 简单验证：检查是否是JWT格式
                if (token.split('.').length !== 3) {
                    throw new Error('Token格式无效');
                }
                
                // 跳转到Vue应用的认证回调路由
                const callbackUrl = `${window.location.origin}/auth/callback?token=${encodeURIComponent(token)}`;
                
                updateStatus('登录成功！', '正在跳转到应用...');
                
                console.log('🚀 准备跳转到Vue应用:', callbackUrl);
                
                // 延迟1秒后跳转，让用户看到成功信息
                setTimeout(() => {
                    window.location.href = callbackUrl;
                }, 1000);
                
            } catch (error) {
                console.error('❌ 处理回调失败:', error);
                updateStatus('登录失败', error.message, true);
                
                // 3秒后跳转回首页
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        }
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', processCallback);
        
        // 调试信息
        console.log('🔍 当前URL:', window.location.href);
        console.log('📋 URL参数:', getUrlParams());
    </script>
</body>
</html>
```

### 3.2 AuthCallback.vue 组件设计

必须创建 `src/components/AuthCallback.vue` 组件来处理最终的认证回调：

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

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const status = ref('processing'); // 'processing', 'success', 'error'
const errorMessage = ref('');

onMounted(async () => {
  console.log('AuthCallback页面加载，处理登录回调...');
  
  try {
    // 从URL参数中获取Token
    const token = route.query.token;
    
    if (!token) {
      throw new Error('未找到访问令牌');
    }
    
    console.log('获取到Token，设置认证状态...');
    
    // 设置Token到store
    const success = authStore.setToken(token);
    
    if (!success) {
      throw new Error('Token设置失败');
    }
    
    status.value = 'success';
    
    // 获取重定向路径
    const redirectPath = localStorage.getItem('auth_redirect_path');
    
    console.log('登录成功，准备跳转到:', redirectPath);
    
    // 清除临时存储的重定向路径
    localStorage.removeItem('auth_redirect_path');
    
    // 延迟跳转，让用户看到成功信息
    setTimeout(() => {
      if (redirectPath && redirectPath.startsWith('/')) {
        // 相对路径跳转
        router.push(redirectPath);
      } else {
        // 默认跳转到任务列表
        router.push('/download-center/tasks');
      }
    }, 1000);
    
  } catch (error) {
    console.error('登录回调处理失败:', error);
    status.value = 'error';
    errorMessage.value = error.message;
    
    // 3秒后跳转到首页
    setTimeout(() => {
      router.push('/');
    }, 3000);
  }
});
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-container {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.status-text {
  margin-top: 20px;
}

.status-text p {
  font-size: 16px;
  color: #606266;
  margin: 0;
}
</style>
```
```

#### 2.5 修改 "4.1. 路由规划" 章节

**位置：** 第375行后面添加

```markdown
- `/auth/callback` : 认证回调处理页面（处理来自用户服务的登录回调）
```

#### 2.6 修改 "4.2. 路由守卫配置" 章节

**位置：** 替换第402-432行的路由守卫代码

```typescript
// 路由守卫增强版本
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
    if (!authStore.checkTokenExpiry()) {
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

#### 2.7 修改 "5.1.1. 认证Store设计" 章节

**位置：** 第615-678行actions中添加

```typescript
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
},
```

#### 2.8 修改 "5.2.1. HTTP拦截器配置" 章节

**位置：** 替换第743-758行的响应拦截器代码

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

## 📋 **实施步骤建议**

### 第一阶段：文档更新
1. 按照上述方案逐一修改两个提示词文档
2. 确保所有代码示例的语法正确性
3. 验证配置项的完整性和一致性

### 第二阶段：代码实现
1. 先实现媒体下载服务的跨域认证支持
2. 再实现用户服务的外部回调支持
3. 进行端到端测试验证

### 第三阶段：安全加固
1. 实施域名白名单机制
2. 添加Token验证和错误处理
3. 完善日志记录和监控

### 第四阶段：文档完善
1. 补充部署配置说明
2. 添加故障排除指南
3. 完善安全最佳实践文档

## 🚨 **重要注意事项**

1. **安全第一**：必须严格验证外部域名，防止恶意重定向
2. **用户体验**：确保整个认证流程有合适的加载状态和错误提示
3. **向后兼容**：新增功能不应影响现有的内部认证流程
4. **充分测试**：在不同浏览器和网络环境下测试完整流程
5. **文档同步**：确保代码实现与文档描述保持一致
