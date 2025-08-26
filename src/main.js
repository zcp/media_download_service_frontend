/**
 * 应用程序入口文件
 * 初始化Vue应用、路由、状态管理和UI组件库
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

// 创建Vue应用实例
const app = createApp(App);

// 注册Pinia状态管理
const pinia = createPinia();
app.use(pinia);

// 注册Vue Router
app.use(router);

// 注册Element Plus UI组件库
app.use(ElementPlus);

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 全局错误处理
app.config.errorHandler = (error, vm, info) => {
  console.error('全局错误:', error);
  console.error('错误信息:', info);
  console.error('组件实例:', vm);
};

// 应用启动前的初始化
async function initializeApp() {
  try {
    console.log('正在初始化应用...');
    
    // 初始化认证状态
    const authStore = useAuthStore();
    await authStore.initializeAuth();
    
    console.log('应用初始化完成');
    
    // 挂载应用
    app.mount('#app');
    
    console.log('应用启动成功');
  } catch (error) {
    console.error('应用初始化失败:', error);
    
    // 降级处理：仍然挂载应用，但清除认证状态
    const authStore = useAuthStore();
    authStore.clearAuth();
    
    app.mount('#app');
  }
}

// 启动应用
initializeApp();