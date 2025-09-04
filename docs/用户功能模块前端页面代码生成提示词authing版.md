# LiveCore Service - 用户模块前端设计文档 (uni-app + Vue3)

## 后端API服务器基础URL（全局可配置）

-   当前后端用户模块API服务器地址为：
    `http://124.220.235.226:8002/` **（注意：不是https）**
-   该地址仅作为当前环境示例，未来可能变动，**禁止在任何页面或业务代码中硬编码该URL**。
-   必须在`constants/api.ts`中定义全局常量`BASE_API_URL`，并通过环境变量（如`.env`）支持多环境切换。

### 跨服务SSO集成配置

**外部应用回调支持：**
- 支持来自其他服务前端的SSO登录请求  
- 通过URL参数 `external_callback=true&origin=<domain>` 识别外部应用
- 登录成功后自动跳转回外部应用

**安全域名管理：**
- 必须在环境配置中维护允许的外部应用域名白名单
- 禁止跳转到未授权的域名，防止恶意重定向攻击
-   代码示例：
    ```ts
    // constants/api.ts - HBuilderX 兼容的环境变量读取方式
    
    // 优先从 import.meta.env 读取，其次从 window.__ENV（由 config/env.js 注入）
    const getEnv = (key: string): string => {
      const viteEnv = (import.meta as any)?.env?.[key];
      const runtimeEnv = (typeof window !== 'undefined' ? (window as any).__ENV?.[key] : undefined);
      return viteEnv || runtimeEnv || '';
    };

    export const BASE_API_URL: string = (
      getEnv('VITE_BASE_API_URL') || 'http://124.220.235.226:8002/'
    ).replace(/\/?$/, '/');

    export const AUTHING_REDIRECT_URI_H5: string =
      getEnv('VITE_AUTHING_REDIRECT_URI_H5') ||
      (typeof window !== 'undefined' ? `${window.location.origin}/pages/auth/callback` : '');

    // 跨服务SSO配置常量
    export const ALLOWED_ORIGINS: string[] = (
      getEnv('VITE_ALLOWED_ORIGINS') || 'localhost:3000'
    ).split(',').map(s => s.trim());

    export const EXTERNAL_CALLBACK_PATH: string = 
      getEnv('VITE_EXTERNAL_CALLBACK_PATH') || '/simple-callback.html';

    export const ENABLE_EXTERNAL_CALLBACK: boolean = 
      getEnv('VITE_ENABLE_EXTERNAL_CALLBACK') === 'true';
    ```
    
    **重要**：需在 `index.html` 中引入配置文件：
    ```html
    <script src="/config/env.js"></script>
    <script type="module" src="/main.js"></script>
    ```
	
### 环境变量配置 (`config/env.js`)

```javascript
// 环境变量配置文件 - HBuilderX 兼容方案
// 请根据实际部署环境修改这些值

export const ENV_CONFIG = {
  // ===== 自有业务后端 API 地址 =====
  VITE_BASE_API_URL: 'http://124.220.235.226:8002/',
  
  // ===== Authing 用户池与应用配置 =====
  VITE_AUTHING_USER_POOL_ID: 'your_user_pool_id',
  VITE_AUTHING_CLIENT_ID: 'your_current_app_client_id', 
  VITE_AUTHING_HOST: 'your-app.authing.cn',
  
  // （仅 H5 使用）第三方登录回调地址 redirect_uri
  VITE_AUTHING_REDIRECT_URI_H5: 'http://localhost:5173/pages/auth/callback',
  
  // ===== 跨服务SSO配置 =====
  // 允许的外部回调域名列表（安全控制）
  VITE_ALLOWED_ORIGINS: 'localhost:3000,localhost:3001,localhost:8080,127.0.0.1:3000,127.0.0.1:3001',
  
  // 外部应用回调页面路径
  VITE_EXTERNAL_CALLBACK_PATH: '/simple-callback.html',
  
  // 是否启用外部应用回调功能
  VITE_ENABLE_EXTERNAL_CALLBACK: 'true',
};

// 开发/生产环境自动切换
const isDev = typeof window !== 'undefined' && 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 导出到全局供 constants/api.ts 读取
if (typeof window !== 'undefined') {
  window.__ENV = ENV_CONFIG;
}
```

**部署说明**：
- **本地开发**：直接修改 `config/env.js` 中的配置值
- **Docker部署**：构建时替换配置文件或通过脚本动态生成
- **多环境**：可创建 `config/env.dev.js`、`config/env.prod.js` 等
> ✅ **部署建议**：所有环境变量应通过 CI/CD 加密注入，避免明文暴露在代码仓库中。


-   迁移/部署时，只需修改环境变量或配置文件，无需改动业务代码。
-   **所有API请求必须通过`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。**

## 目录

-   1.  概述
-   2.  项目结构 (uni-app + Vue3)
-   3.  UI设计规范
-   4.  核心功能模块设计
-   5.  状态管理 (Pinia)
-   6.  路由与导航
-   7.  API 服务层
-   8.  开发规范
-   9.  响应式与多端适配
-   10. 团队协作与扩展性
-   11. 常见问题与FAQ

-   **版本**: 1.1 (uni-app版)
-   **状态**: 修订稿
-   **设计日期**: 2025-07-31
-   **前端技术栈**: `uni-app`, `Vue3`, `Pinia`, `uni-ui`, `HBuilderX`, `TypeScript`, `SCSS`

## 1. 概述


### 1.1. 文档目的

本文档旨在为 **LiveCore Service** 项目的用户模块前端应用提供一个全面的设计和开发规范。它基于已定稿的后端用户核心模块API，并**集成了Authing作为SSO单点登录与第三方身份源的统一认证解决方案**。本文档定义了前端的技术选型、项目结构、核心功能实现、状态管理方案和开发标准，旨在指导前端团队高效、规范地完成开发工作。

### 1.2. 技术选型

| 分类 | 技术选型 | 用途说明 |
| :--- | :--- | :--- |
| **核心框架** | `uni-app` | 使用Vue语法，一套代码编译到多端平台，实现跨端开发。 |
| **页面语法** | `Vue3` | **推荐使用Vue3 Composition API（`<script setup>`）**。 |
| **状态管理** | Pinia | 推荐Pinia，全局store统一管理用户、认证等状态。 |
| **身份认证服务** | `@authing/web`（H5）、`@authing/miniapp`（微信小程序） | **（新增）** 前端专用SDK，用于发起第三方登录授权流程（微信、Apple 等），获取 `id_token`。 |
| **UI组件** | uni-ui/官方组件/原生HTML | 推荐优先使用`uni-ui`和`uni-app`官方组件。 |
| **HTTP请求** | `uni.request` | 框架内置请求库，直接使用，并封装拦截器逻辑。 |
| **样式处理** | SCSS/CSS | 支持全局和内联，推荐`<style lang="scss" scoped">`。 |
| **开发工具** | `HBuilderX` | DCloud官方IDE，是`uni-app`项目的最佳开发环境。 |
| **类型支持** | TypeScript | 推荐 `<script setup lang="ts">`，提升类型安全。 |


强制依赖：uni-forms、uni-easyinput、uni-load-more、uni-list、uni-list-item、uni-file-picker、uni-card（若页面有用到再补充）。
安装方式二选一，且需把安装方式写入文档：
HBuilderX 插件市场安装（推荐）：安装后这些组件出现在项目根目录 uni_modules/ 下，必须提交到仓库。
NPM 安装：npm i @dcloudio/uni-ui -S（或 pnpm add @dcloudio/uni-ui），并按下方 easycom 配置到 pages.json。
CI/初始化要求：克隆仓库后，如未见到 uni_modules/uni-xxx 目录，必须先执行安装步骤，否则 H5 无法解析 uni-xxx 组件。

## 1.3. Authing 集成配置流程 (前置准备)

在开发前，需由后端或运维同学完成以下在Authing控制台的配置。

### Step 1：创建用户池

1.  登录 [Authing 控制台](https://console.authing.cn)
2.  创建用户池 → 记录 `User Pool ID`
3.  配置：
      - **登录方式**：重点配置**社会化登录**，如微信小程序、Apple ID 等。
      - 短信/邮箱模板（用于验证码等场景）。

### Step 2：为每个应用创建独立“应用”

路径：用户池 → 应用 → 创建应用。为不同端（管理后台、H5、iOS App等）创建独立应用，以获取独立的 `Client ID` 和 `Client Secret`，并配置精确的回调地址。

| 业务系统 | 类型 | 回调地址示例 |
|--------|------|--------------|
| 管理后台 | 单页应用（SPA） | `https://admin.yourdomain.com/callback` |
| H5 页面 | 单页应用（SPA） | `https://h5.yourdomain.com/callback` |
| iOS App | 原生应用（Native） | `yourapp://authing/callback` |

> ✅ **注意**：原生 App 使用 `Custom Scheme` 作为回调地址，需在 Authing 应用配置中正确填写。

#### Step 2.1：Redirect URI 配置规范（H5｜新增）

- 前端通过环境变量 `VITE_AUTHING_REDIRECT_URI_H5` 配置回调页地址（与 Authing 控制台白名单严格一致）。
- 文档默认的回调页路径为 `/pages/auth/callback`，请按实际 H5 域名拼接：
  - 本地开发：`http://localhost:<port>/pages/auth/callback`
  - 线上环境：`https://h5.yourdomain.com/pages/auth/callback`
- 代码通过 `constants/api.ts` 导出的 `AUTHING_REDIRECT_URI_H5` 读取，不在业务代码中硬编码；未配置时在 H5 端回落为 `window.location.origin + '/#/pages/auth/callback'`。

**注意** 因为oidc的要求，回调url中不能包含**#**.

## 2. 项目结构 (uni-app + Vue3)

**uni-app (Vue3) 项目特性说明：**

-   文件扩展名：页面和组件统一使用 `.vue`。
-   推荐开发工具：HBuilderX。
-   状态管理：Pinia进行全局状态管理。
-   UI组件：优先`uni-ui`和`uni-app`官方组件。
-   语法风格：推荐Vue3 Composition API (`<script setup lang="ts">`)。

```
/
├── api/                     # API 服务层
│   ├── auth.ts              # 认证相关接口 (密码登录、注册、登出)
│   ├── authing.ts           # (新增) Authing SDK 封装 (发起第三方登录)
│   ├── user.ts              # 用户信息、资料相关接口
│   └── membership.ts        # 会员产品、订阅相关接口
├── public/
│   └── simple-callback.html    # 外部登录回调处理页面
├── components/              # 全局可复用组件
|   |── AuthCallback.vue    # Vue 路由回调组件
│
├── composables/             # Vue 3 组合式函数
│   ├── useCaptcha.ts        # 图形验证码逻辑
│   └── usePagination.ts     # 分页逻辑
│
├── constants/               # 全局常量
│
├── pages/                   # 业务页面
│   ├── auth/                # 认证相关页面
│   │   ├── login.vue        # (将增加第三方登录入口)
│   │   ├── register.vue     # (将增加第三方登录入口)
│   │   ├── callback.vue     # (H5 回调页，仅 H5 使用)
│   │   ...
│   ...
│
├── static/                  # 静态资源
│
├── store/                   # Pinia 状态管理
│
├── utils/                   # 工具函数
│
├── styles/                  # 全局样式
│
├── pages.json               # 页面路由与窗口表现配置
├── manifest.json            # 应用配置
└── main.ts                  # uni-app 初始化入口文件
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

### 说明

-   **store/** 目录为必须，所有全局状态用Pinia管理。
-   **所有页面、组件文件**统一为`.vue`，内容全部采用Vue3 `<script setup lang="ts">`。
-   **推荐TypeScript**，如无特殊需求可用JS。
-   **样式**可内联或全局SCSS，推荐`<style lang="scss" scoped">`。

## 3. UI设计规范

-   视觉风格参考Bilibili专业化页面设计，采用主色调（蓝、灰、白）、卡片分区、圆角、阴影、简洁图标，提升专业感和一致性。
-   所有页面和组件应统一采用卡片分区、Tab分区、状态标签、进度条、空状态、加载动画等UI模式。
-   重要操作、状态、入口配合图标和色彩标签，提升可用性和美观度。
-   列表、详情、表单等页面均应有空状态、加载动画、全局反馈（Toast/Notification）等统一交互体验。
-   PC端优先采用分栏/表格/批量操作/快捷键，移动端优先采用Tab/卡片/弹窗/滑动操作，所有页面需自适应主流分辨率。
-   大数据量列表建议采用虚拟滚动，任务/状态有实时需求时采用轮询或WebSocket实时刷新。
-   交互细节如操作确认、批量操作、分组按钮、信息密度、专业性等，均参考Bilibili风格并结合医疗/科技SaaS场景。

## 4. 跨服务SSO集成实现规范

### 4.1. 外部应用登录检测要求

**功能描述：** 在 `pages/auth/login.vue` 页面中实现外部应用回调检测机制

#### 4.1.1. URL参数检测逻辑
**实现要求：**
- 必须检测URL参数：`external_callback` (布尔值) 和 `origin` (域名)
- 当 `external_callback=true` 且 `origin` 有值时，判定为外部应用登录请求
- 设置响应式变量 `isExternalLogin` 用于控制UI显示
- 在页面 `onMounted` 钩子中执行检测逻辑
- 检测到外部登录时，显示Toast提示："来自外部应用的登录请求"

#### 4.1.2. 外部登录UI提示组件
**设计要求：**
- 在登录表单上方添加条件显示的提示区域
- 提示文本：主标题"🔗 来自外部应用的登录请求"，副标题"登录成功后将自动跳转回应用"
- 样式：渐变蓝紫色背景，白色文字，圆角设计，居中对齐
- 仅在 `isExternalLogin` 为 `true` 时显示

#### 4.1.3. 外部回调处理函数设计
**函数签名：** `handleExternalCallback(token: string, userInfo?: any): boolean`
**核心逻辑：**
- 检查是否为外部回调请求（根据URL参数）
- 域名白名单验证：使用 `ALLOWED_ORIGINS` 常量验证 `origin` 参数
- 构建回调URL：`${protocol}://${origin}/simple-callback.html?token=${token}`
- 协议判断：localhost/127.0.0.1 使用 http，其他使用 https
- 跳转前显示"登录成功，正在跳转..."提示，延迟1秒执行跳转
- 返回布尔值表示是否处理了外部回调

### 4.2. 登录成功处理逻辑增强

#### 4.2.1. 用户名密码登录集成
**修改要求：**
- 在登录成功回调中调用 `handleExternalCallback` 函数
- 如果返回 `true`（已处理外部回调），则跳过内部页面跳转
- 如果返回 `false`（内部登录），则执行原有的内部跳转逻辑

#### 4.2.2. 第三方登录函数增强
**修改要求：**
- 所有第三方登录函数（Google、Apple、微信H5等）在跳转到Authing前：
  - 检查URL参数中的 `external_callback` 和 `origin`
  - 如果存在，将其保存到 `uni.setStorageSync('external_callback', true)` 和 `uni.setStorageSync('external_origin', origin)`
- 确保第三方登录回调时能够获取这些参数

### 4.3. 第三方登录回调页面增强

**页面：** `pages/auth/callback.vue`
**增强要求：**
- 在SSO登录成功后，检查 `localStorage` 中的外部回调信息
- 如果存在 `external_callback` 和 `external_origin`，执行外部跳转逻辑：
  - 清除 `localStorage` 中的相关信息
  - 验证域名白名单
  - 构建外部回调URL并跳转
  - 阻止默认的内部页面跳转
- 如果不存在外部回调信息，执行原有的内部跳转逻辑

### 4.4. 样式设计规范

**外部登录提示样式要求：**
- 背景：蓝紫色渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- 圆角：`12rpx`
- 内边距：`24rpx`
- 文字颜色：主标题白色，副标题半透明白色
- 字体大小：主标题 `32rpx`，副标题 `24rpx`
- 布局：居中对齐，垂直间距 `8rpx`

### 4.5. 安全实施要求

**强制安全措施：**
1. **域名白名单验证**：必须使用 `ALLOWED_ORIGINS` 常量严格验证来源域名
2. **参数验证**：对所有URL参数进行非空和格式验证
3. **错误处理**：无效域名时显示错误提示，记录安全日志
4. **HTTPS强制**：生产环境必须使用HTTPS传递Token
5. **调试日志**：关键步骤必须输出console.log便于调试

## 5. 核心功能模块设计

### 通用交互原则

-   全局加载状态、API错误提示、表单校验反馈细化、多端适配说明等，全部采用Vue3 + Pinia + 组件化最佳实践。
-   表单、按钮、交互等全部用`uni-ui`/`uni-app`官方组件优先，补充原生HTML。

## 5. 状态管理（Pinia + Vue3）

-   推荐使用 Pinia 进行全局状态管理，所有用户、认证、会员等状态集中在 store/modules 下。
-   页面内状态采用 Vue3 Composition API 的 `ref`、`reactive`。
-   持久化可结合 Pinia 插件或手动同步到 `uni.setStorageSync`。

```ts
// store/modules/user.ts
import { defineStore } from 'pinia'
export const useUserStore = defineStore('user', {
  state: () => ({ token: '', userInfo: null }),
  actions: { /* ... */ }
})
// 页面中
<script setup lang="ts">
import { useUserStore } from '@/store/modules/user'
const userStore = useUserStore()
</script>
```

## 6\. 路由与导航

  - 页面路由全部在`pages.json`中配置，页面路径全部为`.vue`。
  - 路由守卫可在`main.ts`中用`uni.addInterceptor`实现，登录校验用Pinia store。
  - （新增 | H5 回调）需在 `pages.json` 中新增回调页：`/pages/auth/callback`，用于第三方登录完成后的回跳处理。

## 7\. API 服务层

  - 所有API请求统一用`utils/request.ts`封装，支持请求/响应拦截器，自动携带token。
  - 推荐TypeScript类型声明。
  - （新增）在`constants/api.ts`中增加 SSO 登录常量：`SSO_LOGIN: `${BASE_API_URL}api/v1/auth/sso-login``。
  - （新增）依赖安装（按平台）：
    ```bash
    # H5
    npm i @authing/web

    # 微信小程序
    npm i @authing/miniapp
    ```
- 实现约束：仅新增 `SSO_LOGIN` 常量与 `ssoLogin(id_token)` 方法，不修改已有 API 封装与签名。

## 8\. 开发规范

### 8.1 通用与命名规范

-   **组件化开发**：所有可复用UI元素封装为组件。
-   **表单验证**：优先用`uni-forms`校验规则，复杂校验用`utils/validator.ts`。
-   **代码风格**：遵循Vue3官方风格指南，统一代码格式。
-   **类型支持**：推荐TypeScript。
-   **状态与变量命名**:
      表单数据: 所有页面的表单数据必须统一存放在一个名为 formData 的 reactive 对象中。
       示例: const formData = reactive({ username: '', password: '' });
      加载状态: 所有用于控制加载中状态（如按钮禁用、显示loading动画）的变量，必须命名为 isLoading，并使用 ref。
       示例: const isLoading = ref(false);
     组合式函数: 从组合式函数（Composables）返回的响应式变量，应直接解构使用。
       示例: const { captchaImage, refreshCaptcha } = useCaptcha();

### 8.2 安全规范 (新增)

为保障应用安全，所有开发活动必须遵循以下前端安全规范：

1.  **登录注册验证码机制**：**已覆盖**。登录、注册等关键操作必须集成图形验证码，防止自动化脚本的暴力破解。

2.  **Token 鉴权与刷新机制**：**已覆盖**。前后端需协同实现基于 `access_token` 和 `refresh_token` 的会话管理机制，保障长期会话安全。

3.  **Authing Client Secret 保护**: **（新增）** Authing应用的 `Client Secret` **严禁**出现在任何前端代码、Git提交、日志或浏览器控制台中。它仅供后端服务使用。

4.  **Authing 回调地址白名单**: **（新增）** 所有用于接收Authing回调的URL（如`https://h5.yourdomain.com/callback`）必须在Authing控制台对应应用的“回调地址”中精确配置，协议、域名、端口、大小写必须完全匹配。

5.  **XSS (跨站脚本) 防护**：
    -   所有从API获取或用户输入的内容，在页面渲染时必须进行转义。
    -   严禁使用 `v-html` 指令渲染任何可能包含用户输入内容的HTML字符串。
    -   对URL参数进行合法性校验，特别是用于跳转的`redirect`参数。

6.  **本地缓存加密**：
    -   所有敏感信息（如 `access_token`, `refresh_token`, 用户信息）在存入本地缓存 (`uni.setStorageSync`) 前，**必须**使用 `utils/crypto.ts` 中提供的加密算法（如AES）进行加密。
    -   `utils/storage.ts` 文件需封装加密存储和解密读取的逻辑，业务代码禁止直接调用 `uni.setStorageSync` 存取敏感信息。

7.  **请求频率与重放防护**：
    -   前端请求拦截器 (`utils/request.ts`) **必须**为所有非GET请求添加 `timestamp` (请求时间戳) 和 `nonce` (随机数) 参数。
    -   前端需配合后端，使用约定的密钥 (`client_secret`) 对请求参数、`timestamp`、`nonce` 进行签名（如HMAC-SHA256），生成 `signature` 参数并随请求发送。后端需进行验签。

8.  **CSRF (跨站请求伪造) 防护 (Web/H5端)**：
    -   在Web（H5）环境下，所有状态变更的请求（POST/PATCH/DELETE等）**必须**携带后端通过Cookie或API下发的 `X-CSRF-Token` 请求头。
    -   `utils/request.ts` 需包含在H5环境下自动获取并附加此请求头的逻辑。

9.  **Clickjacking (点击劫持) 防护 (Web/H5端)**：
    -   前端需与运维/后端协作，确保所有H5页面的服务器响应头中包含 `X-Frame-Options: DENY` 或 `X-Frame-Options: SAMEORIGIN`，禁止页面被恶意`iframe`嵌套。

8.  **总结与建议**：
    前端安全是一个系统性工程，应采取"纵深防御"策略。以上规范旨在建立第一道防线，但不能替代后端的安全校验。前后端必须紧密协作，共同构建一个从客户端到服务器的全链路安全体系。任何安全疑虑都应及时提出并与团队讨论。

### 8.3 增量接入 Authing 的执行边界（强制）

- 必须新增
  - 新增 `api/authing.ts`（条件编译：H5 用 `@authing/web`，小程序用 `@authing/miniapp`）
  - 在 `constants/api.ts` 增加 `SSO_LOGIN = \`${BASE_API_URL}api/v1/auth/sso-login\``
  - 在 `api/auth.ts` 增加 `ssoLogin(id_token)` 封装（仅新增，不改已有方法）
  - 在登录/注册页“第三方登录区”新增入口按钮；调用 `api/authing.ts` 获取 `id_token` 后调用 `/sso-login`
  - 新增 `pages/auth/callback.vue`（仅 H5 使用），用于第三方登录回跳后从 SDK 会话中获取 `id_token` 并调用 `/sso-login`

- 可选（不做也不影响既有功能）
  - `App.vue` 启动时 SSO 检查：仅 H5 生效；小程序返回 `null`

- 明确禁止
  - 不删除或重构既有函数/类型/状态流
  - 不修改现有账号密码登录、验证码、请求拦截器与 Pinia 逻辑
  - 不改动与本次无关的页面和模块



## 9\. 响应式与多端适配
- 核心策略：采用 `rpx` 单位进行基础的等比缩放适配，保证在移动端各类屏幕上的一致性。在此基础上，必须结合媒体查询（Media Queries）进行布局结构的调整，以实现在平板和PC等大屏幕设备上的最佳体验。
- 布局单位优先用`rpx`、`vw`、百分比。
- 全局`flex`布局，支持横竖屏切换。
- 断点、字体、图片自适应，所有页面多端适配。所有适配必须遵循附录A的规范。

## 10\. 团队协作与扩展性

  - 分支管理、代码评审、CI/CD、文档同步等按团队规范执行。

## 11\. 常见问题与FAQ

  - 表单校验规则集中在`/utils/validator.ts`，页面和组件均复用。
  - Mock推荐用`mocks/`目录或团队统一平台。
  - Token丢失或过期由请求拦截器自动处理。
  - 多端适配遇到兼容性问题建议封装多端兼容组件。


## 附录A: 响应式布局增强规范 —— 媒体查询（Media Queries） (新增)

### A.1. 核心理念：rpx + 媒体查询

1.  **`rpx` (基础适配)**：作为移动端优先的默认单位，保证在各类手机屏幕上的等比缩放效果和一致性。所有基础样式（字体大小、边距、圆角等）应首先使用 `rpx`。

2.  **媒体查询 (布局调整)**：用于处理从窄屏到宽屏的 **布局结构变化**。例如，当屏幕宽度超过某个阈值（断点）时，将单列布局变为多列网格布局，或限制内容区域的最大宽度以提高可读性。

### A.2. 全局断点（Breakpoints）定义

为了保持项目的一致性，所有媒体查询都应使用在 `styles/global.scss` 中预定义的全局变量。该文件必须被创建并包含以下内容：

**文件路径: `styles/global.scss`**

```scss
/* --- 响应式断点 --- */
/* 可根据项目目标设备微调 */
$breakpoint-sm: 576px;  // 小屏幕 (手机竖屏)
$breakpoint-md: 768px;  // 中等屏幕 (平板)
$breakpoint-lg: 992px;  // 大屏幕 (桌面显示器)
$breakpoint-xl: 1200px; // 超大屏幕 (宽屏桌面)
```

### A.3. 实施指南与代码示例

所有需要进行响应式布局的页面或组件，**必须** 在其 `<style lang="scss" scoped">` 块的顶部导入全局样式文件，并使用预定义的断点变量。

**使用方法:**

```vue
<style lang="scss" scoped>
@import '@/styles/global.scss';

.my-element {
  // 默认样式 (移动端优先)
  width: 100%; 

  // 在屏幕宽度 >= 768px 时应用的样式
  @media (min-width: $breakpoint-md) {
    width: 50%;
  }

  // 在屏幕宽度 >= 992px 时应用的样式
  @media (min-width: $breakpoint-lg) {
    width: 33.33%;
  }
}
</style>
```



# 用户模块前端设计文档——页面清单

## 1\. 认证相关页面（/pages/auth/）

  - **登录页** 路径：`/pages/auth/login.vue`
    功能：用户名/邮箱/手机号+密码+验证码登录
  - **注册页** 路径：`/pages/auth/register.vue`
    功能：新用户注册
  - **忘记密码页** 路径：`/pages/auth/forget-password.vue`
    功能：发起密码重置请求（输入邮箱+验证码）
  - **重置密码页** 路径：`/pages/auth/reset-password.vue`
    功能：通过邮件token重置新密码

## 2\. 用户中心相关页面（/pages/user/）

  - **个人资料页** 路径：`/pages/user/profile.vue`
    功能：展示用户信息、手机号、会员、编辑、注销、绑定等入口
  - **编辑资料页** 路径：`/pages/user/edit-profile.vue`
    功能：修改昵称、头像、简介等
  - **绑定手机号页** 路径：`/pages/user/bind-phone.vue`
    功能：绑定手机号（短信验证码）
  - **修改密码页** 路径：`/pages/user/change-password.vue`
    功能：修改当前密码

## 3\. 会员相关页面（/pages/membership/）

  - **会员产品列表页** 路径：`/pages/membership/products.vue`
    功能：展示所有可购买会员产品
  - **我的订阅页** 路径：`/pages/membership/my-memberships.vue`
    功能：展示、筛选、管理我的会员订阅

## 4\. 首页

  - **首页** 路径：`/pages/index/index.vue`
    功能：项目主入口（可根据实际业务扩展）

## 5\. 其他（如有）

  - 弹窗/对话框（如注销确认、绑定手机号成功提示等）通常作为组件，不单独成页，但如需单独页面可补充。
  - 会员支付页、第三方登录回调页等如后续业务扩展可单独设计。

-----

# 各页面代码生成提示词模板（含后端API接口与数据库字段）

-----

# 基础支撑文件代码生成提示词

请帮我生成LiveCore Service前端项目的基础支撑文件，要求如下：

1.  `constants/api.ts`
      - 集中管理所有API基础URL、各模块API路径（如auth、user、membership等）、本地存储Key等。
      - API基础URL支持多环境切换（如通过.env）。
      - 所有API路径必须通过常量拼接，禁止在页面和业务代码中硬编码URL。
      - 推荐TypeScript，导出所有常量。
2.  `styles/theme.scss` 和 `styles/global.scss`
      - 主题色、辅助色、字体、圆角、阴影、间距等全局样式变量。
      - 风格需参考Bilibili专业化页面设计，主色调为蓝、灰、白，卡片分区、圆角、阴影明显。
      - 支持全局和内联SCSS变量。
3.  `pages.json`
      - 配置所有页面路径（全部为`.vue`）、导航栏标题、tabBar等。
      - 页面路径、标题、tabBar需与设计文档页面清单一致。
      - 支持多端适配。
4.  `store/index.ts` 和 `store/modules/user.ts`、`membership.ts`等
      - 使用Pinia进行全局状态管理，用户、认证、会员等模块化。
      - 每个模块包含state、actions、getters，推荐TypeScript。
      - 支持token等敏感信息的本地持久化（如uni.setStorageSync）。
5.  `utils/request.ts`
      - 封装uni.request，支持请求/响应拦截器。
      - 自动携带token，统一错误处理（如401自动登出、Toast提示）。
      - 支持TypeScript类型声明。
      - 便于所有页面和API模块import复用。

通用要求：

  - 所有文件必须严格遵循本设计文档的全局规范。
  - 代码风格需符合ESLint/Prettier规范，推荐TypeScript。
  - 不要生成页面业务代码，只生成上述基础支撑文件。
  - 每个文件单独输出，文件名和内容要清晰标注。
  - 以上改动必须遵循“8.3 增量接入 Authing 的执行边界”，严禁对现有逻辑做破坏性修改。
-----

## 1\. 登录页 /pages/auth/login.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  **API 请求失败时，必须优先展示后端返回的 `message` 字段作为错误提示。仅当后端未返回 `message` 或发生网络级别错误时，才可使用"网络错误"等通用提示。(新增)**

### A. 后端API接口

  - 登录接口：POST `${BASE_API_URL}api/v1/auth/login`
      - 请求参数（JSON）：
          - username: string（用户名/邮箱/手机号，必填，≤50）
          - password: string（必填，需符合密码强度规则：最小长度≥8，且至少包含1个大写字母[A-Z]、1个小写字母[a-z]、1个数字[0-9]、1个特殊字符[!@#$%^&*(),.?":{}|<>]）
          - captcha\_id: string（必填）
          - captcha\_solution: string（必填）
      - 响应字段：
          - code: int
          - message: string
          - data: { access\_token, refresh\_token, userInfo }
          - timestamp: string
  - 获取验证码接口：GET `${BASE_API_URL}api/v1/auth/captcha`

  - **（新增）SSO及第三方登录接口**：`POST /api/v1/auth/sso-login`
    - 请求头：`Content-Type: application/json`
    - 请求体：
      ```json
      { "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
      ```
    - 成功响应（结构与`/api/v1/auth/login`完全一致）：
      ```json
      {
        "code": 200,
        "message": "success",
        "data": {
          "access_token": "xxx",
          "refresh_token": "yyy",
          "token_type": "bearer"
        },
        "timestamp": "2025-08-15T20:00:00Z"
      }
      ```
    - 失败响应示例：
      - 401（第三方凭证无效）：
        ```json
        { "code": 3005, "message": "第三方认证凭证无效", "data": { "error": "Invalid or expired id_token" } }
        ```
      - 422（请求体验证失败）：后端标准错误结构
  * **实现流程描述 (核心逻辑)**:
    1.  **接收 Token**: 从请求体中获取 `id_token`。
    2.  **安全验证**: 调用 `AuthingService.verify_id_token` 方法，使用 Authing SDK 对 `id_token` 进行严格验证（签名、过期时间、audience、issuer）。**验证失败，立即返回 401 错误**。
    3.  **解析身份**: 验证成功后，从返回的 `payload` 中提取关键信息，主要是 `sub` (作为 `social_id`) 和 `email` (用于绑定)。
    4.  **查找或创建本地用户 (`find_or_create_user` 逻辑)**:
        a.  **第一步 (精确查找)**: `SELECT * FROM users WHERE social_provider = 'authing' AND social_id = :sub`。如果找到用户，进入步骤 5。
        b.  **第二步 (邮件绑定)**: 如果上一步未找到，且 `payload` 中包含 `email`，则 `SELECT * FROM users WHERE email = :email`。如果找到用户，说明该用户是老用户（通过密码注册），现在首次使用第三方登录。此时，应将 `social_provider = 'authing'` 和 `social_id = :sub` 更新到该用户记录中，完成**账户自动绑定**。然后进入步骤 5。
        c.  **第三步 (创建新用户)**: 如果以上两步均未找到用户，则在 `users` 表中创建一个新用户。`password_hash` 为 `NULL`，`social_provider` 设为 `'authing'`，`social_id` 设为 `sub`。`email`, `nickname`, `avatar_url` 等字段可从 `payload` 中获取。`is_email_verified` 根据 `payload` 中的 `email_verified` 字段设置。
    5.  **状态检查**: 检查找到或创建的本地用户的 `status` 是否为 `'NORMAL'`。如果被封禁 (`'BANNED'`)，则返回 403 Forbidden 错误。
    6.  **颁发业务 Token**: 为该本地用户生成系统自身的 `access_token` 和 `refresh_token`（**此步骤与 `/login` 接口完全一致**）。
    7.  **更新登录信息**: 更新用户的 `last_login_at` 和 `last_login_ip` 字段。
    8.  **返回 Token**: 提交数据库事务，并返回与 `/login` 接口结构相同的成功响应。

### B. 相关数据库字段（users表）

  - username VARCHAR(50) UNIQUE NOT NULL
  - email VARCHAR(255) UNIQUE NOT NULL
  - phone\_number VARCHAR(20) UNIQUE
  - password\_hash VARCHAR(128) NOT NULL
  - is\_active BOOLEAN
  - is\_superuser BOOLEAN
  - nickname VARCHAR(50) NOT NULL
  - avatar\_url VARCHAR(512)
  - is\_phone\_verified BOOLEAN

<!-- end list -->

```markdown
## 页面名称：登录页
- 路径：/pages/auth/login.vue

### 1. 页面功能
- 用户通过用户名/邮箱/手机号+密码+图形验证码登录。
- 通过点击社交图标（如微信、Apple）**发起第三方登录**。
- 登录成功后保存token，跳转到用户中心或redirect页面。

### 2. UI结构
- 使用`uni-forms`表单，表单整体置于卡片分区（Bilibili风格，圆角、阴影、主色调）。
- 账号输入框（`uni-easyinput`，placeholder: 用户名/邮箱/手机号，配图标）。
- 密码输入框（`uni-easyinput`，type="password"，配图标）。
- **（新增）第三方登录区域**：
      - 在表单下方或有明确视觉分割的区域，放置一行社交登录图标按钮（如微信、Apple等）。
      - 可以配有“或通过以下方式登录”的提示文字。
- 图形验证码组件（`<CaptchaInput>`，含图片和输入框，支持点击刷新，加载动画）。
- 登录按钮（`button`，主色调，加载/禁用状态明显）。
- "忘记密码""立即注册"文本链接，移动端底部对齐。


### 3. 交互逻辑
- 所有字段必填，账号≤50字符，密码需符合强度规则（见下），验证码必填。
- 登录按钮点击后进入加载状态，调用`POST ${BASE_API_URL}api/v1/auth/login`。
- 登录成功：保存token到Pinia和storage，设置`isLoggedIn=true`，跳转。
- 登录失败：toast提示后端message，刷新验证码。
- 支持redirect回跳逻辑。
- 表单校验采用`/utils/validator.ts`规则，实时+提交校验。
- 空状态/错误状态有友好提示，所有反馈用Toast/Notification。
- **第三方登录（新增）**：
    1. 改动范围受“8.3 增量接入 Authing 的执行边界”约束：仅插入入口与调用，不改原有表单、校验、请求与跳转逻辑。
    2. 点击社交图标（例如微信/Apple），按平台调用：
       - H5：`appleLogin()`；内部会使用 `@authing/web` 的 `social.authorize('apple', { scope: 'email name', redirect_uri: AUTHING_REDIRECT_URI_H5 })`
       - 小程序：`wxMiniLogin()`；内部会使用 `@authing/miniapp` 的 `social.authorize('wechatmini', { code })`
### 8. 回调页（H5） /pages/auth/callback.vue（新增）
- 职责：第三方登录完成后（H5），从 SDK 会话中获取 `id_token` 并调用后端 `/api/v1/auth/sso-login`，成功后按 `redirect` 参数或默认首页跳转。
- 条件编译：
  - `#ifdef H5` 执行回调处理逻辑；
  - `#ifndef H5` 直接 `uni.reLaunch` 到首页或登录页（兜底）。
- 路由：`pages.json` 必须包含 `/pages/auth/callback` 条目（仅 H5 运行时会生效）。
    3. 授权成功后，前端获得 `id_token`；随后调用后端 `POST /api/v1/auth/sso-login`。
    4. 后续逻辑（保存token、跳转页面）与本地登录成功后的逻辑**完全相同**。

### 核心逻辑
1. 进入页面自动调用 `api/auth.js` 的 `getCaptcha()` 方法获取 `captcha_id` 和 `image_base64`，渲染验证码图片，支持点击刷新。
2. 表单所有字段（账号、密码、验证码）均为必填，输入时实时校验，提交时再次校验，校验规则与后端一致。
3. 登录按钮点击后进入加载/禁用状态，调用 `store/modules/user.ts` 的 `login` action，传入表单数据。
4. `login` action 内部调用 `api/auth.js` 的 `login()` 方法，携带所有参数请求 `POST ${BASE_API_URL}api/v1/auth/login`。
5. 登录成功后，将返回的 `access_token` 和 `refresh_token` 存入 Pinia 和 `uni.setStorageSync`，设置登录状态 `isLoggedIn = true`，并自动调用 `fetchUserProfile` 刷新全局用户信息，跳转到用户中心页或来源页。
6. 登录失败时（如密码错误、验证码错误），使用 `uni.showToast` 显示后端返回的 `message`，并刷新验证码，登录按钮恢复可用。
7. 移动端支持点击按钮和软键盘回车登录，PC端支持回车快捷键。
8. 登录表单、按钮、验证码等均有加载动画、禁用/可用状态切换，所有反馈用Toast/Notification。
9. 严格防止XSS，所有输入均做前端和后端双重校验。
10. **（新增）** 新增调用`api/authing.ts`的逻辑，处理第三方登录。成功后，将获取的`id_token`提交给后端新接口`/api/v1/auth/sso-login`。后续的 `store` 更新、页面跳转等流程与本地登录复用。


### 4. 样式与风格
- 主题色、按钮、输入框风格与全局一致，引用`styles/theme.scss`。
- 全局字体、间距、圆角，按钮/输入框/提示样式统一。
- 卡片分区、图标、色块等视觉元素参考Bilibili风格。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，容器 `login-container` 宽度为 `100%` 或接近 `100%`，并带有适当的水平内边距。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为 `login-container` 设置一个 `max-width` (例如 `400px`)，并保持水平居中。这可以防止表单在宽屏上被过度拉伸。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。
- 登录接口防暴力破解（已集成验证码）。

### 7. 依赖与复用
- 依赖`composables/useCaptcha.ts`。
- 依赖`store/modules/user.ts`。
- 复用全局按钮、输入框组件。
- 常量路径用`constants/api.ts`、`constants/route.ts`。



-----

## 2\. 注册页 /pages/auth/register.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 注册接口：POST `${BASE_API_URL}api/v1/users/register`
      - 请求参数（JSON）：
          - username: string（必填，1-50，唯一）
          - email: string（必填，≤255，唯一，邮箱格式）
		  - **password: string（必填，必须符合以下所有规则）**：
              -   最小长度为8位。
              -   必须包含至少一个大写字母 (A-Z)。
              -   必须包含至少一个小写字母 (a-z)。
              -   必须包含至少一个数字 (0-9)。
              -   必须包含至少一个特殊字符 (例如: `!@#$%^&*()`)。
          - nickname: string（必填，1-50）
          - captcha\_id: string（必填）
          - captcha\_solution: string（必填）
      - 响应字段：
          - code: int
          - message: string
          - data: object/null
          - timestamp: string
  - 获取验证码接口：GET `${BASE_API_URL}api/v1/auth/captcha`
  - **（新增）** SSO及第三方登录接口：`POST /api/v1/auth/sso-login` (同登录页)
  
  
### B. 相关数据库字段（users表）

  - username VARCHAR(50) UNIQUE NOT NULL
  - email VARCHAR(255) UNIQUE NOT NULL
  - password\_hash VARCHAR(128) NOT NULL
  - nickname VARCHAR(50) NOT NULL

<!-- end list -->

```markdown
## 页面名称：注册页
- 路径：/pages/auth/register.vue

### 1. 页面功能
- 用户注册新账号，填写用户名、邮箱、密码、确认密码、昵称、图形验证码。
- **一键注册/登录**：通过第三方社交账号（微信、Apple等）直接完成注册和登录。

### 2. UI结构
- `uni-forms`表单。
- 用户名、邮箱、密码、确认密码、昵称输入框（`uni-easyinput`）。
- 图形验证码组件（`<CaptchaInput>`）。
- 注册按钮（全局主题色）。
- "已有账号？去登录"文本链接。
- **（新增）第三方注册/登录区域**：
      - 与登录页类似，在表单下方提供社交登录图标按钮，作为一种更快捷的注册方式。
	   
### 3. 交互逻辑
- 所有字段必填，用户名≤50，邮箱≤255，密码需符合强度规则（见下），昵称≤50。
- 确认密码需与密码一致。
- 表单校验用`/utils/validator.ts`，实时+提交校验。
- 注册按钮点击后进入加载状态，调用`POST ${BASE_API_URL}api/v1/users/register`。
- 成功：toast提示"注册成功"，跳转登录页或自动登录。
- 失败：toast提示后端message，刷新验证码。
  - **第三方登录（新增）**：交互逻辑与登录页的第三方登录**完全相同**。用户点击社交图标，前端获取`id_token`并提交给后端的`/api/v1/auth/sso-login`接口。后端会根据`id_token`中的信息判断是绑定老用户还是创建新用户。
  - 
### 核心逻辑
1. 进入页面自动调用 `api/auth.js` 的 `getCaptcha()` 方法获取 `captcha_id` 和 `image_base64`，渲染验证码图片，支持点击刷新。
2. 表单所有字段（用户名、邮箱、密码、确认密码、昵称、验证码）均为必填，输入时实时校验，提交时再次校验，所有校验规则与后端一致（如密码复杂度、唯一性等）。
3. 注册按钮点击后进入加载/禁用状态，调用`POST ${BASE_API_URL}api/v1/users/register`。
4. 注册成功后，toast提示"注册成功"，可选择自动登录或跳转到登录页。
5. 注册失败时（如用户名已存在、验证码错误），toast提示后端返回的错误信息，并刷新验证码，按钮恢复可用。
6. 所有表单项有格式提示和错误提示，移动端/PC端表单布局自适应。
7. 严格防止XSS，所有输入均做前端和后端双重校验。

### 4. 样式与风格
- 主题色、按钮、输入框风格与全局一致。
- 全局字体、间距、圆角。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%` 或接近 `100%`，并带有适当的水平内边距。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为表单容器设置一个 `max-width` (例如 `450px`)，并保持水平居中，以提高在宽屏上的可读性和美观度。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`composables/useCaptcha.ts`。
- 复用全局按钮、输入框组件。
- 常量路径用`constants/api.ts`、`constants/route.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 3\. 忘记密码页 /pages/auth/forget-password.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 请求重置接口：POST `${BASE_API_URL}api/v1/auth/password-reset-request`
      - 请求参数（JSON）：
          - email: string（必填，≤255）
          - captcha\_id: string（必填）
          - captcha\_solution: string（必填）
      - 响应字段：
          - code: int
          - message: string
          - data: object/null
          - timestamp: string
  - 获取验证码接口：GET `${BASE_API_URL}api/v1/auth/captcha`

### B. 相关数据库字段（users表）

  - email VARCHAR(255) UNIQUE NOT NULL

<!-- end list -->

```markdown
## 页面名称：忘记密码页
- 路径：/pages/auth/forget-password.vue

### 1. 页面功能
- 用户通过邮箱+图形验证码发起密码重置请求。

### 核心逻辑
1. 进入页面自动调用 `api/auth.js` 的 `getCaptcha()` 方法获取 `captcha_id` 和 `image_base64`，渲染验证码图片，支持点击刷新。
2. 表单所有字段（邮箱、验证码）均为必填，输入时实时校验，提交时再次校验。
3. 按钮点击后进入加载状态，调用`POST ${BASE_API_URL}api/v1/auth/password-reset-request`。
4. 无论邮箱是否存在，toast提示"如果该邮箱已注册，一封密码重置邮件已发送"。
5. 表单校验用`/utils/validator.ts`。

### 3. 样式与风格
- 主题色、按钮、输入框风格与全局一致。

### 4. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%` 或接近 `100%`，并带有适当的水平内边距。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为表单容器设置一个 `max-width` (例如 `450px`)，并保持水平居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 5. 安全与异常处理
- 防止接口探测注册用户。
- 错误统一toast提示。

### 6. 依赖与复用
- 依赖`composables/useCaptcha.ts`。
- 常量路径用`constants/api.ts`。

### 7. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 4\. 重置密码页 /pages/auth/reset-password.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 重置密码接口：POST `${BASE_API_URL}api/v1/auth/password-reset`
      - 请求参数（JSON）：
          - reset\_token: string（必填）
          - **new\_password: string（必填，必须符合以下所有规则）**：
              -   最小长度为8位。
              -   必须包含至少一个大写字母 (A-Z)。
              -   必须包含至少一个小写字母 (a-z)。
              -   必须包含至少一个数字 (0-9)。
              -   必须包含至少一个特殊字符 (例如: `!@#$%^&*()`)。
      - 响应字段：
          - code: int
          - message: string
          - data: object/null
          - timestamp: string

### B. 相关数据库字段（users表）

  - password\_hash VARCHAR(128) NOT NULL

<!-- end list -->

```markdown
## 页面名称：重置密码页
- 路径：/pages/auth/reset-password.vue

### 1. 页面功能
- 用户通过邮件token设置新密码。

### 2. UI结构
- 新密码输入框、确认新密码输入框（`uni-easyinput`，type="password"）。
- "确认重置"按钮。

### 核心逻辑
1. 页面onLoad获取token参数，无token则提示"无效链接"。
2. 表单所有字段（新密码、确认新密码）均为必填，输入时实时校验，提交时再次校验，密码复杂度与注册页一致。
3. 按钮点击后进入加载状态，调用`POST ${BASE_API_URL}api/v1/auth/password-reset`。
4. 成功：toast提示"密码重置成功"，跳转登录页。
5. 失败：toast提示后端message。

### 3. 样式与风格
- 主题色、按钮、输入框风格与全局一致。

### 4. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%` 或接近 `100%`，并带有适当的水平内边距。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为表单容器设置一个 `max-width` (例如 `450px`)，并保持水平居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 5. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。

### 6. 依赖与复用
- 常量路径用`constants/api.ts`。

### 7. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 5\. 个人资料页 /pages/user/profile.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 获取当前用户信息：GET `${BASE_API_URL}api/v1/users/me`
      - 响应字段（data）：
          - id, username, email, phone\_number, nickname, avatar\_url, bio, is\_phone\_verified, is\_active, created\_at, updated\_at
  - 注销账户：DELETE `${BASE_API_URL}api/v1/users/me`
  - 退出登录：POST `${BASE_API_URL}api/v1/auth/logout`

### B. 相关数据库字段（users表）

  - id UUID
  - username VARCHAR(50)
  - email VARCHAR(255)
  - phone\_number VARCHAR(20)
  - nickname VARCHAR(50)
  - avatar\_url VARCHAR(512)
  - bio TEXT
  - is\_phone\_verified BOOLEAN
  - is\_active BOOLEAN
  - created\_at TIMESTAMPTZ
  - updated\_at TIMESTAMPTZ

<!-- end list -->

```markdown
## 页面名称：个人资料页
- 路径：/pages/user/profile.vue

### 1. 页面功能
- **全面展示**当前用户的个人资料，包括：头像、昵称、简介、用户名、邮箱、手机号、会员状态、账户状态、注册时间等所有关键信息。
- 提供编辑资料、修改密码、绑定手机号、注销账户、退出登录等操作入口。

### 核心逻辑
1. 进入页面时自动调用`GET ${BASE_API_URL}api/v1/users/me`获取用户信息，数据加载时显示骨架屏/加载动画。
2. "编辑资料"、"修改密码"、"绑定手机号"、"注销账户"入口点击后跳转对应页面。
3. "退出登录"按钮点击后，调用`POST ${BASE_API_URL}api/v1/auth/logout`，清空本地和Pinia中的所有用户数据和token，跳转到登录页。
5. 所有操作均有Toast/Notification反馈，移动端/PC端布局自适应。
6. 绑定手机号入口根据用户状态动态显示。
7. 严格防止XSS，所有展示内容均做转义。

### 2. UI结构
- **顶部用户信息卡片**:
  -   包含用户头像 (`avatar_url`)、昵称 (`nickname`) 和邮箱 (`email`)。
- **主信息列表 (`uni-list`)**:
  -   `uni-list-item`：用户名 (`username`)
  -   `uni-list-item`：个人简介 (`bio`, 内容过长时可省略，点击后完整展示)
  -   `uni-list-item`：手机号 (`phone_number`, 未绑定时显示"未绑定"，并提供绑定入口)
  -   `uni-list-item`：会员状态 (从会员store获取)
  -   `uni-list-item`：用户ID (`id`)
  -   `uni-list-item`：账户状态 (`is_active`, 显示为"正常"或"已冻结")
  -   `uni-list-item`：手机验证状态 (`is_phone_verified`, 显示为"已验证"或"未验证")
  -   `uni-list-item`：注册时间 (`created_at`, 日期需格式化)
  -   `uni-list-item`：最后更新 (`updated_at`, 日期需格式化)
- **操作按钮区域**:
  -   以按钮组或列表项形式提供："编辑资料"、"修改密码"、"注销账户"、"退出登录"。

### 3. 交互逻辑
- 页面加载时从store获取用户信息，无则调用`GET ${BASE_API_URL}api/v1/users/me`。
- "编辑资料"跳转edit-profile，"修改密码"跳转change-password。
- "绑定手机号"未绑定时显示入口，已绑定显示脱敏手机号。
- "注销账户"弹窗二次确认，调用`DELETE ${BASE_API_URL}api/v1/users/me`，成功后登出。

### 4. 样式与风格
- 头像圆形，信息列表风格与全局一致。
- 按钮、间距、字体、主题色统一。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，页面内容容器宽度为 `100%`。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-md` (768px) 及以上时，为页面主内容容器设置一个 `max-width` (例如 `800px`)，并保持水平居中，以防止列表在宽屏上过分拉伸，提高信息密度和可读性。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。
- 
### 6. 安全与异常处理
- 仅展示当前登录用户信息。
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`store/modules/user.ts`。
- 复用全局按钮、列表组件。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 6\. 编辑资料页 /pages/user/edit-profile.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 更新当前用户信息：PATCH `${BASE_API_URL}api/v1/users/me`
      - 请求参数（JSON）：
          - nickname: string（1-50，可选）
          - avatar\_url: string（≤512，可选）
          - bio: string（≤300，前端建议，后端TEXT，可选）
      - 响应字段：同GET `${BASE_API_URL}api/v1/users/me`

### B. 相关数据库字段（users表）

  - nickname VARCHAR(50)
  - avatar\_url VARCHAR(512)
  - bio TEXT

<!-- end list -->

```markdown
## 页面名称：编辑资料页
- 路径：/pages/user/edit-profile.vue

### 1. 页面功能
- 修改昵称、头像、个人简介。

### 核心逻辑
1. 进入页面时自动调用`GET ${BASE_API_URL}api/v1/users/me`获取用户信息，填充表单。
2. 昵称≤50字符，简介≤300字符。
3. 保存前校验，调用`PATCH ${BASE_API_URL}api/v1/users/me`。
4. 成功：更新store，toast提示，返回上一页。

### 2. UI结构
- 头像上传（`uni-file-picker`）。
- 昵称输入框（`uni-easyinput`）。
- 个人简介输入框（`uni-easyinput`，type="textarea"）。
- 保存按钮。

**重要补充要求：**
- 所有 `uni-forms-item` 组件必须设置 `label` 属性，确保字段标签正确显示
- 头像上传区域：`label="头像"`
- 昵称输入区域：`label="昵称"`  
- 个人简介区域：`label="个人简介"`
- 表单验证规则必须通过 `formRules` 对象定义，包含字符长度限制

### 3. 交互逻辑
- 页面加载时从store获取用户信息，填充表单。
- 昵称≤50字符，简介≤300字符。
- 保存前校验，调用`PATCH ${BASE_API_URL}api/v1/users/me`。
- 成功：更新store，toast提示，返回上一页。

### 4. 样式与风格
- 主题色、按钮、输入框风格与全局一致。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%`。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-md` (768px) 及以上时，为表单容器设置一个 `max-width` (例如 `720px`)，并保持水平居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`store/modules/user.ts`。
- 常量路径用`constants/api.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 7\. 绑定手机号页 /pages/user/bind-phone.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 发送验证码：POST `${BASE_API_URL}api/v1/auth/verification-codes`
      - 请求参数（JSON）：
          - channel: string（SMS）
          - recipient: string（手机号）
          - scenario: string（BIND\_PHONE）
          - captcha\_id: string
          - captcha\_solution: string
  - 绑定手机号：POST `${BASE_API_URL}api/v1/users/me/phone`
      - 请求参数（JSON）：
          - phone\_number: string（≤20，唯一）
          - verification\_code: string
  - 获取当前用户信息：GET `${BASE_API_URL}api/v1/users/me`

### B. 相关数据库字段（users表）

  - phone\_number VARCHAR(20) UNIQUE
  - is\_phone\_verified BOOLEAN

<!-- end list -->

```markdown
## 页面名称：绑定手机号页
- 路径：/pages/user/bind-phone.vue

### 1. 页面功能
- 为当前用户绑定手机号，通过短信验证码验证。

### 核心逻辑
1. 进入页面自动获取并显示图形验证码。
2. 手机号、验证码均为必填，输入时实时校验，提交时再次校验。
3. "获取验证码"调用`POST ${BASE_API_URL}api/v1/auth/verification-codes`（scenario: BIND_PHONE），按钮倒计时。
4. "确认绑定"调用`POST ${BASE_API_URL}api/v1/users/me/phone`，成功后刷新用户信息，toast提示，返回个人资料页。

### 2. UI结构
- 手机号输入框（`uni-easyinput`）。
- 验证码输入框（`uni-easyinput`）。
- "获取验证码"按钮（带倒计时）。
- "确认绑定"按钮。

### 3. 交互逻辑
- 手机号格式校验，验证码必填。
- "获取验证码"调用`POST ${BASE_API_URL}api/v1/auth/verification-codes`（scenario: BIND_PHONE），按钮倒计时。
- "确认绑定"调用`POST ${BASE_API_URL}api/v1/users/me/phone`，成功后刷新用户信息，toast提示，返回个人资料页。

### 4. 样式与风格
- 主题色、按钮、输入框风格与全局一致。


### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%`。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为表单容器设置一个 `max-width` (例如 `480px`)，并保持水平居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`composables/useCaptcha.ts`、`store/modules/user.ts`。
- 常量路径用`constants/api.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 8\. 修改密码页 /pages/user/change-password.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 修改密码：POST `${BASE_API_URL}api/v1/users/me/password`
      - 请求参数（JSON）：
          - current\_password: string（必填）
          - **new\_password: string（必填，必须符合以下所有规则）**：
              -   最小长度为8位。
              -   必须包含至少一个大写字母 (A-Z)。
              -   必须包含至少一个小写字母 (a-z)。
              -   必须包含至少一个数字 (0-9)。
              -   必须包含至少一个特殊字符 (例如: `!@#$%^&*()`)。
      - 响应字段：
          - code: int
          - message: string
          - data: object/null
          - timestamp: string

### B. 相关数据库字段（users表）

  - password\_hash VARCHAR(128) NOT NULL

<!-- end list -->

```markdown
## 页面名称：修改密码页
- 路径：/pages/user/change-password.vue

### 1. 页面功能
- 用户修改当前密码。

### 核心逻辑
1. 表单所有字段（当前密码、新密码、确认新密码）均为必填，输入时实时校验，提交时再次校验。
2. "提交"按钮点击后进入加载/禁用状态，调用`POST ${BASE_API_URL}api/v1/users/me/password`。
3. 成功：清空token和Pinia状态，toast提示"密码修改成功，请重新登录"，跳转登录页。
4. 失败：toast提示后端message。

### 2. UI结构
- 当前密码输入框（`uni-easyinput`，type="password"）。
- 新密码输入框（`uni-easyinput`，type="password"）。
- 确认新密码输入框（`uni-easyinput`，type="password"）。
- 提交按钮。

### 3. 交互逻辑
- 所有字段必填，新密码与确认新密码一致，且需符合强度规则（见下）。
- 提交调用`POST ${BASE_API_URL}api/v1/users/me/password`。
- 成功：清空token和Pinia状态，toast提示"密码修改成功，请重新登录"，跳转登录页。
- 失败：toast提示后端message。

### 4. 样式与风格
- 主题色、按钮、输入框风格与全局一致。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，表单容器宽度为 `100%`。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-sm` (576px) 及以上时，为表单容器设置一个 `max-width` (例如 `480px`)，并保持水平居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 严格输入校验，防止XSS。
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`store/modules/user.ts`。
- 常量路径用`constants/api.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 9\. 会员产品列表页 /pages/membership/products.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 获取会员产品列表：GET `${BASE_API_URL}api/v1/membership-products`
      - 响应字段（data）：
          - id, product\_code, name, price, description, duration, status, created\_at, updated\_at

### B. 相关数据库字段（membership\_products表）

  - id UUID
  - product\_code VARCHAR(50) UNIQUE
  - name VARCHAR(100)
  - price NUMERIC
  - description TEXT
  - duration INTEGER
  - status VARCHAR(20)
  - created\_at TIMESTAMPTZ
  - updated\_at TIMESTAMPTZ

<!-- end list -->

```markdown
## 页面名称：会员产品列表页
- 路径：/pages/membership/products.vue

### 1. 页面功能
- 展示所有可购买会员产品，支持查看详情、发起购买。

### 核心逻辑
1. 进入页面时自动调用`GET ${BASE_API_URL}api/v1/membership-products`获取产品列表。
2. "立即购买"按钮预留点击事件（可跳转支付页或弹窗）。

### 2. UI结构
- 使用`uni-card`循环展示会员产品。
- 每个卡片包含产品名称、描述、价格、"立即购买"按钮。

### 3. 交互逻辑
- 页面加载时调用`GET ${BASE_API_URL}api/v1/membership-products`获取产品列表。
- "立即购买"按钮预留点击事件（可跳转支付页或弹窗）。

### 4. 样式与风格
- 卡片、按钮、字体、间距、主题色与全局一致。

### 5. 适配与响应式 (增强)
- **核心要求**：**必须** 使用媒体查询实现响应式网格布局。
- **移动端优先 (默认)**：`product-wrapper` 容器宽度为 `100%`，实现单列布局（每行1个）。
- **平板端**：在屏幕宽度达到 `$breakpoint-md` (768px) 及以上时，`product-wrapper` 容器宽度为 `50%`，实现双列布局（每行2个）。
- **PC端**：在屏幕宽度达到 `$breakpoint-lg` (992px) 及以上时，`product-wrapper` 容器宽度为 `33.333%`，实现三列布局（每行3个）。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。`product-wrapper` 需要设置 `box-sizing: border-box;` 和适当的 `padding` 来保证间距。

### 6. 安全与异常处理
- 错误统一toast提示。

### 7. 依赖与复用
- 常量路径用`constants/api.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 10\. 我的订阅页 /pages/membership/my-memberships.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 获取我的订阅：GET `${BASE_API_URL}api/v1/users/me/memberships`
      - 请求参数：page, size
      - 响应字段（data）：
          - id, user\_id, product\_code, start\_time, end\_time, is\_auto\_renew, status, created\_at, updated\_at
  - 更新订阅（如取消自动续费）：PATCH `${BASE_API_URL}api/v1/users/me/memberships/{subscription_uuid}`
      - 请求参数（JSON）：
          - is\_auto\_renew: boolean

### B. 相关数据库字段（user\_membership表）

  - id UUID
  - user\_id UUID
  - product\_code VARCHAR(50)
  - start\_time TIMESTAMPTZ
  - end\_time TIMESTAMPTZ
  - is\_auto\_renew BOOLEAN
  - status VARCHAR(20)
  - created\_at TIMESTAMPTZ
  - updated\_at TIMESTAMPTZ

<!-- end list -->

```markdown
## 页面名称：我的订阅页
- 路径：/pages/membership/my-memberships.vue

### 1. 页面功能
- 展示、筛选、管理当前用户的会员订阅记录，支持分页、无限滚动、取消自动续费。

### 核心逻辑
1. 数据获取通过`composables/usePagination.ts`封装，调用`GET ${BASE_API_URL}api/v1/users/me/memberships`。
2. 支持筛选、分页、无限滚动。
3. 管理按钮调用`PATCH ${BASE_API_URL}api/v1/users/me/memberships/{uuid}`，更新自动续费状态。
4. 加载、空数据、加载完成等状态友好提示。

### 2. UI结构
- 顶部分段器（`uni-segmented-control`）或下拉菜单筛选状态。
- 订阅列表（`uni-list`）。
- 页面底部`uni-load-more`组件。

### 3. 交互逻辑
- 数据获取通过`composables/usePagination.ts`封装，调用`GET ${BASE_API_URL}api/v1/users/me/memberships`。
- 支持筛选、分页、无限滚动。
- 管理按钮调用`PATCH ${BASE_API_URL}api/v1/users/me/memberships/{uuid}`，更新自动续费状态。
- 加载、空数据、加载完成等状态友好提示。

### 4. 样式与风格
- 列表、按钮、加载提示、空态组件风格与全局一致。

### 5. 适配与响应式 (增强)
- **核心要求**：**必须** 使用媒体查询实现响应式列表布局。
- **移动端优先 (默认)**：列表项容器宽度为 `100%`，实现单列布局。
- **平板及PC端**：在屏幕宽度达到 `$breakpoint-md` (768px) 及以上时，列表项容器宽度可以调整为 `50%`，实现双列布局，以提高信息密度。如果内容较宽，可维持`100%`宽度，但为列表父容器设置 `max-width` (例如 `960px`) 并居中。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 错误统一toast提示。

### 7. 依赖与复用
- 依赖`composables/usePagination.ts`。
- 常量路径用`constants/api.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

-----

## 11\. 首页 /pages/index/index.vue

【通用强制要求】

1.  所有API请求必须通过`constants/api.ts`的`BASE_API_URL`常量拼接，不允许硬编码服务器地址或IP。
2.  表单、按钮、卡片、配色、圆角、阴影等UI风格必须严格参考本设计文档UI规范。
3.  表单校验、Toast、Loading等必须调用全局工具或组件。
4.  依赖Pinia store、全局常量、API封装等必须import并使用。
5.  代码风格需符合ESLint/Prettier规范，推荐TypeScript。
6.  生成完整的 **`.vue`** 文件（含`<template>`、`<script setup lang="ts">`、`<style lang="scss" scoped">`）。
7.  仅生成本页面相关代码，风格、交互、适配、安全等需严格遵循本设计文档。
8.  必须遵循开发规范中定义的状态命名约定（如`formData`, `isLoading`）。
9.  **所有API请求和数据存储必须遵守"开发规范-安全规范"中的所有要求。(新增)**

### A. 后端API接口

  - 无特定接口（如需展示用户信息可用GET `${BASE_API_URL}api/v1/users/me`）

### B. 相关数据库字段

  - 无特定字段（如需展示用户信息可用users表）

<!-- end list -->

```markdown
## 页面名称：首页
- 路径：/pages/index/index.vue

### 1. 页面功能
- 项目主入口，展示欢迎信息、导航入口等（可根据实际业务扩展）。

### 核心逻辑
1. 进入页面自动调用`GET ${BASE_API_URL}api/v1/users/me`获取用户信息，无则调用`GET ${BASE_API_URL}api/v1/users/me`。
2. 顶部banner、欢迎语。
3. 主要功能入口按钮或卡片（如登录、注册、会员产品、个人中心等）。
4. 点击入口跳转对应页面，支持登录状态判断。

### 2. UI结构
- 顶部banner、欢迎语。
- 主要功能入口按钮或卡片（如登录、注册、会员产品、个人中心等）。

### 3. 交互逻辑
- 点击入口跳转对应页面，支持登录状态判断。

### 4. 样式与风格
- 主题色、按钮、卡片、字体、间距与全局一致。

### 5. 适配与响应式 (增强)
- **移动端优先**：默认情况下，内容容器宽度为 `100%`。
- **PC端适配**：**必须** 使用媒体查询。在屏幕宽度达到 `$breakpoint-lg` (992px) 及以上时，为内容容器设置一个 `max-width` (例如 `1200px`)，并保持水平居中。这能确保在宽屏显示器上，核心内容聚焦于屏幕中央，避免过于分散。
- **样式要求**：必须在 `<style>` 块中 `@import '@/styles/global.scss';` 并使用预定义的断点变量。

### 6. 安全与异常处理
- 无需特殊处理。

### 7. 依赖与复用
- 常量路径用`constants/route.ts`。

### 8. 代码生成要求
- 生成完整Vue SFC，风格、交互、适配、安全等需严格遵循设计文档。
```

---

## 附录：uni-ui 组件安装与 easycom 配置（H5 解析必读｜仅追加，不修改原文）

为确保 H5 运行时可以正确解析并渲染 `uni-ui` 组件（如 `uni-forms`、`uni-easyinput` 等），团队必须按本附录执行安装与配置。否则会出现 "Failed to resolve component: uni-xxx / Unknown custom element: <uni-xxx>" 的报错，导致表单与列表区域不渲染。

### A. 强制依赖组件清单

- 必装组件：
  - `uni-forms`、`uni-forms-item`
  - `uni-easyinput`
  - `uni-load-more`
  - `uni-list`、`uni-list-item`
  - `uni-file-picker`
  - `uni-card`（若页面用到会员卡片展示）

### B. 安装方式（二选一）

- 方式一（推荐）：HBuilderX 插件市场安装 `uni-ui`
  - 安装后组件会出现在项目根目录 `uni_modules/` 下（例如 `uni_modules/uni-forms`）。
  - 这些目录必须提交到仓库（避免 CI / 新同学拉取后缺组件）。

- 方式二：NPM 安装
  - 使用包管理器安装：`npm i @dcloudio/uni-ui -S` 或 `pnpm add @dcloudio/uni-ui`。
  - 结合下方 `pages.json` 的 easycom 配置（NPM 版）启用自动按需加载。

> 重要：团队仅保留一种安装方式，保持一致性。切换安装方式时，必须同步更新 `pages.json` 的 easycom.custom。

### C. pages.json：easycom 自动注册（保留一种）

- 若使用 `uni_modules`（插件市场安装），建议 `pages.json` 添加：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^uni-(.*)": "@/uni_modules/uni-$1/components/uni-$1/uni-$1.vue"
    }
  }
}
```

- 若使用 NPM（安装 `@dcloudio/uni-ui`），建议 `pages.json` 添加：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^uni-(.*)": "@dcloudio/uni-ui/lib/uni-$1/uni-$1.vue"
    }
  }
}
```

注意：两种 `custom` 方式只能保留其一；修改 `pages.json` 后需重启开发服务器。

### D. 构建配置限制（防止被当作原生自定义元素）

- 禁止在构建配置（如 Vite 的 `vue({ template.compilerOptions.isCustomElement })`）中将 `uni-` 前缀标记为自定义原生元素，否则会跳过组件解析，导致 H5 解析失败。

### E. 验收与自检清单（必须满足）

- H5 Console 不应出现以下警告：
  - "Failed to resolve component: uni-easyinput / uni-forms / uni-load-more …"
- 项目存在以下其一：
  - `uni_modules/uni-forms`、`uni_modules/uni-easyinput` 等目录（插件市场安装）
  - 或 `node_modules/@dcloudio/uni-ui/lib/uni-forms` 等目录（NPM 安装）
- `pages.json` 的 `easycom.custom` 与实际安装方式一致，仅保留一种映射。

### F. 初始化与本地开发（放入 README/新同学入门）

- HBuilderX：安装 `uni-ui` → 看到 `uni_modules` 目录 → 重新运行 H5。
- CLI：执行 `pnpm i`/`npm i` → 检查 `node_modules/@dcloudio/uni-ui` 存在 → 确认 `pages.json` 为 NPM 版 easycom → 重启服务。

### G. 页面依赖速查表（用于 Code Review）

- 认证（登录/注册/忘记密码）：`uni-forms`、`uni-forms-item`、`uni-easyinput`、`uni-load-more`
- 重置密码：`uni-forms`、`uni-forms-item`、`uni-easyinput`
- 个人资料：`uni-list`、`uni-list-item`
- 编辑资料：`uni-file-picker`、`uni-forms`、`uni-easyinput`
- 绑定手机号：`uni-forms`、`uni-easyinput`
- 修改密码：`uni-forms`、`uni-easyinput`
- 会员产品：`uni-card`
- 我的订阅：`uni-list`、`uni-list-item`、`uni-load-more`

以上为"只追加"的文档条目，不修改原有内容。团队按此附录执行后，H5 将能够正常解析并渲染 `uni-ui` 组件。


---

## 附录：验证码跨端显示规范（H5/小程序/App 统一标准｜仅追加，不修改原文）

为确保验证码在多终端稳定、安全地显示，前端与后端需遵循以下规范。

### A. 数据源约束（强制）

- **强制使用 `image_base64`**：前端 **必须** 始终使用后端返回的 `image_base64` 字段作为唯一数据源，并 **忽略** `image_url` 字段（即使后端返回了该字段）。


## 附录B: Authing 集成核心指南 (新增)

### B.1. 核心原则与安全清单

| 角色 | 职责 |
| :--- | :--- |
| **前端** | 调用第三方登录（如微信、Apple），获取身份令牌（`id_token`），并将其发送给后端。 |
| **后端** | 验证令牌合法性（`verify_id_token`），完成与本地用户的绑定或创建，颁发自身业务 token。 |
| **安全铁律** | **后端绝不信任前端传来的任何未经校验的用户身份信息**。所有身份验证必须在后端完成。 |

**必须遵守的安全清单**：

  - **Client Secret**: 仅后端使用，严禁出现在前端代码中。
  - **回调地址**: 必须在Authing控制台精确匹配。
  - **Token 验证**: 前端传来的 `id_token` 必须在后端通过 `verify_id_token` 验证其签名、过期时间、`audience`（Client ID）、`issuer`。
  - **依赖更新**: 定期升级 `@authing/web` SDK，关注安全公告。

### B.2. Authing SDK 能力速查表

#### 前端专用 (`AuthenticationClient`)

| 方法 | 说明 |
| :--- | :--- |
| `new AuthenticationClient(...)` | 初始化 SDK |
| `social.authorize(provider, opts)` | **（核心）** 发起第三方登录（微信、Apple 等） |


### 初始化


### 前端（uni-app + Vue3）—— 多端适配

```ts
// api/authing.ts （条件编译版）
// H5 使用 @authing/web；微信小程序使用 @authing/miniapp

// #ifdef H5
import { AuthenticationClient } from '@authing/web'
// #endif

// #ifdef MP-WEIXIN
import { AuthenticationClient } from '@authing/miniapp'
// #endif

const config = {
  userPoolId: import.meta.env.VITE_AUTHING_USER_POOL_ID,
  appId: import.meta.env.VITE_AUTHING_CLIENT_ID,
  host: import.meta.env.VITE_AUTHING_HOST
}

export const authClient = new AuthenticationClient(config)

// 检查 SSO 登录态（仅 H5 有效；MP 直接返回 null）
export const checkSSO = async () => {
  try {
    // #ifdef H5
    return await authClient.start()
    // #endif
    // #ifndef H5
    return null
    // #endif
  } catch (error) {
    console.error('SSO 检查失败:', error)
    return null
  }
}

// 微信小程序登录（仅 MP 有效）
export const wxMiniLogin = async () => {
  try {
    // #ifdef MP-WEIXIN
    const { code } = await uni.login()
    const user = await authClient.social.authorize('wechatmini', { code })
    return user.id_token
    // #endif
    // #ifndef MP-WEIXIN
    throw new Error('当前平台不支持微信小程序登录')
    // #endif
  } catch (error) {
    throw new Error(`微信登录失败: ${error.message}`)
  }
}

// Apple 登录（仅 H5 有效）
export const appleLogin = async () => {
  try {
    // #ifdef H5
    const user = await authClient.social.authorize('apple', { scope: 'email name', redirect_uri: AUTHING_REDIRECT_URI_H5 })
    return user.id_token
    // #endif
    // #ifndef H5
    throw new Error('当前平台不支持 Apple 登录')
    // #endif
  } catch (error) {
    throw new Error(`Apple 登录失败: ${error.message}`)
  }
}
```

### 方法列表

#### 🔹 `auth_client.start()`

**功能**：检查 SSO 登录态（自动跳转）

##### 参数说明

无参数。

##### 返回值

无返回值。

##### 异常

无异常。

##### 示例

```python
auth_client.start()
```


#### 🔹 `auth_client.social.authorize(provider, opts)`

**功能**：第三方登录（微信、Apple 等）

##### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `str` | 是 | 第三方提供商名称（如 `wechat`, `apple`） |
| `opts` | `dict` | 否 | 额外选项（如 `scope`, `redirect_uri`） |

##### 返回值

无返回值，通常会触发浏览器重定向到第三方登录页面。

##### 异常

| 异常类型 | 说明 |
|--------|------|
| `ProviderNotConfiguredException` | 第三方提供商未配置 |

##### 示例

```python
try:
    auth_client.social.authorize("wechat", {"scope": "snsapi_userinfo"})
except ProviderNotConfiguredException:
    print("微信登录未配置")
```


#### 后端专用 (Python SDK)

| 方法 | 说明 |
| :--- | :--- |
| `oidc.verify_id_token(...)` | **（核心）** 验证 `id_token` 合法性 |
| `users.list()` | 按条件查询用户，辅助判断用户是否已在 Authing 存在 |

### B.3. 常见问题 Q\&A 与行动清单

| 问题 | 排查要点 |
| :--- | :--- |
| 回调地址 400 | 检查 Authing 控制台“应用 → 回调地址”是否 **完全一致**。 |
| `id_token` 验证失败 | 确认后端验证时使用的 `audience` 是**当前前端应用**的 Client ID。 |
| 小程序登录报 “invalid code” | 确认小程序 AppID 与 Authing 控制台配置一致，且 `code` 未过期。 |

### B.5. 微信小程序（基于 Authing）接入要点（新增）

- 运行环境：`MP-WEIXIN`。必须在小程序后台与 Authing 控制台同时配置：小程序 AppID/密钥、合法回调域；并安装 `@authing/miniapp`。
- 前端流程：
  1. `uni.login()` 获取一次性 `code`；
  2. 调用 `authClient.social.authorize('wechatmini', { code })` 获取 `id_token`；（SDK 由 `@authing/miniapp` 提供）
  3. 将 `id_token` 提交至后端 `POST /api/v1/auth/sso-login`，由后端换取业务 token；
  4. 与账号密码登录成功后的流程一致（保存 token、拉取用户信息、跳转）。
- 错误处理：`invalid code` 多由于 `code` 过期或小程序/应用配置不一致；需在 5 分钟内使用并确保环境一致。

#### B.4. **SSO 实施策略**

1.  **调用位置**：
     在应用的统一入口处调用 `checkSSO` 函数，例如 `App.vue` 的 `onLaunch` 生命周期。

2.  **核心逻辑**：

      * 应用启动时，立即执行 `checkSSO()`。
      * **情况一：检查成功**。`checkSSO()` 返回了包含 `id_token` 的用户信息对象。这表明用户已在其他关联应用登录过，存在一个有效的 SSO 会话。
          * 前端获取这个 `id_token`。
          * 调用后端的 `POST /api/v1/auth/sso-login` 接口，将 `id_token` 发送给后端。
          * 后端验证成功后，返回业务 token。前端保存此 token，完成自动登录，并将用户导向首页或目标页。
      * **情况二：检查失败**。`checkSSO()` 返回 `null` 或抛出异常。这表明不存在有效的 SSO 会话。
          * 应用不做任何处理，正常进入流程，如果访问的页面需要登录，则会引导用户至登录页。用户可以在登录页手动进行密码登录或第三方登录。

3. **代码示例**
#### 2. 核心实施逻辑

```typescript
// App.vue
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/modules/user'
import { checkSSO } from '@/api/authing' // 假设路径
import { ssoLogin } from '@/api/auth' // 假设封装了 /sso-login 接口

onLaunch(async () => {
  console.log('App Launch')
  
  const userStore = useUserStore()

  // 1. 检查本地是否存在有效的业务 token，如果存在，直接验证并恢复登录，跳过 SSO 检查
  if (userStore.token) {
    // 可以在这里加一个 token 有效性验证的逻辑
    await userStore.fetchUserProfile();
    return;
  }

  // 2. 本地无 token，开始检查 SSO 登录态
  try {
    const authingUserInfo = await checkSSO();

    // 3. 如果 checkSSO 成功，返回了用户信息对象
    if (authingUserInfo && authingUserInfo.id_token) {
      console.log('SSO session found, attempting to log in...');
      
      // 4. 使用 id_token 调用后端 sso-login 接口，换取业务 token
      const backendResponse = await ssoLogin(authingUserInfo.id_token);

      // 5. 登录成功，保存业务 token 并更新用户信息
      if (backendResponse.code === 200) {
        userStore.setToken(backendResponse.data.access_token);
        await userStore.fetchUserProfile();
        console.log('SSO login successful!');
      } else {
         console.error('SSO login failed:', backendResponse.message);
      }
    } else {
      // 4. 如果 checkSSO 失败或返回 null，说明无 SSO 会话，静默处理即可
      console.log('No active SSO session found.');
    }
  } catch (error) {
    console.error('An error occurred during SSO check:', error);
  }
})

 
### C. 前端跨平台处理策略（核心）

1.  **H5 平台 (Web)**:
    -   **必须** 将 `image_base64` 字符串转换为 `blob:` URL。这是为了绕过浏览器 `Content Security Policy (CSP)` 对 `data:` URI 的潜在限制。
    -   **必须** 使用原生 `<img>` 标签来渲染该 `blob:` URL。

2.  **小程序平台 (如微信小程序)**:
    -   **应** 优先尝试直接使用添加了 `data:image/png;base64,` 前缀的 `image_base64` 字符串。
    -   如直接显示存在兼容性问题或被平台策略限制，**必须** 将 `image_base64` 的内容转存为本地临时文件，并使用该文件路径作为 `src`。

3.  **App 平台**:
    -   可以直接使用添加了 `data:image/png;base64,` 前缀的 `image_base64` 字符串。

### D. 页面模板要求（登录/注册/忘记密码）

-   **必须** 使用条件编译来区分 H5 平台和其他平台：

```vue
<!-- H5平台：使用原生<img>标签渲染blob: URL -->
<!-- #ifdef H5 -->
<img :src="captchaSrc" class="captcha-img" @click="refreshCaptcha" alt="Captcha" />
<!-- #endif -->

<!-- 非H5平台：使用uni-app的<image>组件 -->
<!-- #ifndef H5 -->
<image :src="captchaSrc" class="captcha-img" @click="refreshCaptcha" />
<!-- #endif -->
```

### E. 组合式函数 `useCaptcha.ts` 实现约束

-   **统一返回**: `{ captchaId, captchaSrc, isLoading, refreshCaptcha }`
-   **H5 逻辑**:
    -   必须包含一个 `base64ToBlobUrl` 辅助函数。
    -   `refreshCaptcha` 内部调用此函数将 `image_base64` 转换为 `blob:` URL，并赋值给 `captchaSrc`。
    -   **必须** 使用 `onScopeDispose` 或类似生命周期钩子，在组件卸载时调用 `URL.revokeObjectURL()` 来释放已生成的 `blob:` URL，防止内存泄漏。
-   **小程序逻辑**:
    -   包含将 `base64` 转为临时文件路径的逻辑，并做好 `try...catch` 兜底。
-   `refreshCaptcha` 必须同时更新 `captchaId` 与 `captchaSrc`，并管理好 `isLoading` 状态。

### F. 样式与单位（多端通用约束）

-   (保持不变) 禁止在行内 style 使用 rpx；必须通过类名配合 `<style>`/SCSS 设置尺寸。
-   统一类名：`captcha-img`。

```scss
/* 默认（多端） */
.captcha-img {
  width: 240rpx;
  height: 120rpx;
  border-radius: 12rpx;
  display: inline-block;
  object-fit: contain;
}

/* #ifdef H5 */
.captcha-img { width: 120px; height: 60px; border-radius: 6px; }
/* #endif */
```

### G. FAQ/排查清单（前端自检）

-   **H5 中验证码看不见或显示为破损图标**:
    1.  **检查 `<img>` 标签**：在 DevTools 的 Elements 面板中，确认渲染的是 `<img>` 标签，而不是 `<uni-image>`。
    2.  **检查 `src` 属性**：确认 `src` 的值是一个以 `blob:http://...` 开头的 URL，而不是 `data:image/...` 或相对路径。如果 `src` 为空，说明 `base64ToBlobUrl` 转换失败。
    3.  **检查 Console 控制台**：查看是否有 `Failed to convert base64 to blob url` 或其他 JavaScript 错误。
    4.  **检查 `atob` 合法性**：在 Console 中手动执行 `atob('base64字符串')`，确认后端返回的 base64 没有编码问题。
-   **小程序中验证码看不见**:
    -   检查 `base64 → 临时文件路径` 的转换逻辑是否执行，路径是否生成成功。
-   **刷新无效**:
    -   确认 `refreshCaptcha` 被正确调用，`captchaSrc` 的值在每次刷新后都发生了变化。

---

---

## 附录C: HBuilderX 环境变量配置方案 (新增)

### C.1. 配置文件结构
/config/
├── env.js # 主配置文件（必须）
├── env.dev.js # 开发环境配置（可选）
└── env.prod.js # 生产环境配置（可选

### C.2. 多环境管理

**开发环境** (`config/env.dev.js`)：
```javascript
export const DEV_CONFIG = {
  VITE_BASE_API_URL: 'http://localhost:8002/',
  VITE_AUTHING_HOST: 'your-dev.authing.cn',
  // ... 其他开发环境配置
};
```

**生产环境** (`config/env.prod.js`)：
```javascript
export const PROD_CONFIG = {
  VITE_BASE_API_URL: 'https://api.yourdomain.com/',
  VITE_AUTHING_HOST: 'your-prod.authing.cn',
  // ... 其他生产环境配置
};
```

### C.3. 部署最佳实践

1. **Docker 部署**：
   ```dockerfile
   # 构建时替换配置文件
   COPY config/env.prod.js /app/config/env.js
   ```

2. **CI/CD 集成**：
   ```bash
   # 通过环境变量动态生成配置
   envsubst < config/env.template.js > config/env.js
   ```

3. **安全建议**：
   - 敏感配置（如 Client Secret）仍应通过后端管理
   - 可将 `config/env.local.js` 添加到 `.gitignore`