# 媒体下载服务前端

基于Vue 3 + Pinia + Element Plus构建的媒体下载服务前端应用，支持JWT Token认证和SSO登录。

## 🚀 功能特性

- **JWT认证** - 支持基于JWT Token的用户认证和SSO登录
- **任务管理** - 完整的下载任务生命周期管理（创建、查询、重试、取消）
- **实时更新** - 支持任务状态和进度的实时更新
- **失败处理** - 详细的失败记录管理和重试机制
- **响应式设计** - 适配桌面端和移动端
- **现代UI** - 基于Element Plus的专业级用户界面

## 📋 技术栈

- **框架**: Vue 3 (Composition API)
- **状态管理**: Pinia
- **UI组件库**: Element Plus
- **路由**: Vue Router 4
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **时间处理**: Day.js
- **代码规范**: ESLint

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境配置文件：
```bash
cp env.example .env.local
```

2. 根据实际情况修改`.env.local`中的配置项

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

## 📦 构建部署

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 预览构建结果

```bash
npm run preview
```

## 🏗️ 项目结构

```
src/
├── api/                    # API接口封装
│   └── download.js        # 下载相关API
├── components/            # Vue组件
│   ├── DownloadCenter.vue    # 下载中心主页
│   ├── DownloadTaskList.vue  # 任务列表页
│   ├── DownloadTaskCreate.vue # 创建任务页
│   ├── DownloadTaskDetail.vue # 任务详情页
│   ├── DownloadFailures.vue   # 失败记录页
│   ├── DownloadVideosDetail.vue # 已下载视频页
│   └── NotFound.vue          # 404页面
├── router/                # 路由配置
│   └── index.js          # 路由定义和守卫
├── stores/               # Pinia状态管理
│   ├── auth.js          # 认证状态管理
│   └── download.js      # 下载状态管理
├── utils/               # 工具函数
│   ├── auth.js         # JWT认证工具
│   ├── request.js      # HTTP请求封装
│   └── time.js         # 时间处理工具
├── App.vue             # 根组件
└── main.js             # 应用入口
```

## 🔐 认证机制

### JWT Token认证

应用使用JWT Token进行用户认证：

1. **Token存储**: 使用localStorage持久化存储
2. **自动验证**: 页面加载时自动检查Token有效性
3. **自动跳转**: Token无效时自动跳转到登录页面
4. **请求拦截**: 自动为API请求添加Authorization头

### SSO登录流程

1. 用户访问受保护页面
2. 检查本地Token状态
3. Token无效时跳转到外部登录页面: `http://localhost:5173/pages/auth/login`
4. 登录成功后返回原始访问页面

## 📱 页面功能

### 下载中心 (`/download-center`)

- **左侧导航**: 功能模块导航菜单
- **顶部用户区**: 用户信息显示和登出功能
- **内容区域**: 动态加载子页面内容

### 任务列表 (`/download-center/tasks`)

- **任务管理**: 查看、创建、重试、取消下载任务
- **状态筛选**: 按状态、类型、直播间ID筛选任务
- **实时更新**: 自动轮询获取最新任务状态
- **批量操作**: 支持批量操作多个任务

### 创建任务 (`/download-center/tasks/create`)

- **表单验证**: 完整的前端数据验证
- **智能生成**: 自动生成符合格式的视频ID
- **格式支持**: 支持HLS、MP4、图片等多种资源类型

### 任务详情 (`/download-center/tasks/:taskId`)

- **详细信息**: 完整的任务状态和进度信息
- **实时更新**: 处理中任务的状态实时刷新
- **关联操作**: 快速跳转到失败记录和已下载视频

### 失败记录 (`/download-center/tasks/:taskId/failures`)

- **失败管理**: 查看和管理下载失败的资源
- **重试机制**: 支持单个失败资源的重试
- **错误分析**: 详细的错误类型和错误信息

### 已下载视频 (`/download-center/tasks/:taskId/videos`)

- **视频管理**: 查看任务下已成功下载的视频
- **文件信息**: 显示文件大小、时长、分辨率等详细信息
- **路径复制**: 一键复制文件存储路径

## 🎨 UI/UX设计

### 设计原则

- **专业性**: 采用医疗/专业场景适用的简洁设计
- **易用性**: 清晰的信息层级和操作流程
- **一致性**: 统一的色彩、字体和交互规范
- **响应式**: 良好的多设备适配

### 色彩规范

- **主色调**: 蓝色系 (#409EFF)
- **成功色**: 绿色系 (#67C23A)
- **警告色**: 橙色系 (#E6A23C)
- **危险色**: 红色系 (#F56C6C)
- **信息色**: 灰色系 (#909399)

## 🔧 开发规范

### 代码规范

- 使用ESLint进行代码质量检查
- 遵循Vue 3 Composition API最佳实践
- 组件命名采用PascalCase
- 文件命名采用kebab-case

### 提交规范

使用语义化提交信息：

- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建或辅助工具变更

## 🧪 测试

### 运行单元测试

```bash
npm run test:unit
```

### 测试覆盖率

```bash
npm run test:coverage
```

## 📝 API接口

应用对接后端媒体下载服务API：

- **基础URL**: `/api/v1`
- **认证方式**: JWT Bearer Token
- **响应格式**: 统一的JSON响应格式

详细API文档请参考后端服务文档。

## 🚨 故障排除

### 常见问题

1. **登录跳转问题**: 检查VITE_LOGIN_URL配置是否正确
2. **API请求失败**: 确认VITE_API_BASE_URL配置和后端服务状态
3. **Token过期**: 清除浏览器localStorage中的jwt_token

### 调试建议

1. 开启浏览器开发者工具的Network面板查看API请求
2. 检查Console中的错误信息
3. 使用Vue DevTools调试组件状态

## 📄 许可证

MIT License

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📞 支持

如有问题，请创建Issue或联系开发团队。