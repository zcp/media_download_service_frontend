// API地址常量定义 - 支持多环境配置
// 优先从 import.meta.env 读取，其次从 window.__ENV（由 config/env.js 注入）

// 确保配置已加载的检查函数
const waitForConfig = () => {
  if (typeof window !== 'undefined' && !window.__ENV) {
    console.warn('配置尚未加载，请确保 config/env.js 在此文件之前引入');
  }
};

// 在浏览器环境中检查配置
if (typeof window !== 'undefined') {
  waitForConfig();
}

const getEnv = (key) => {
  const viteEnv = import.meta?.env?.[key];
  const runtimeEnv = typeof window !== 'undefined' ? window.__ENV?.[key] : undefined;
  const result = viteEnv || runtimeEnv || '';

  // 调试：输出环境变量读取情况
  console.log(`读取环境变量 ${key}:`, {
    viteEnv,
    runtimeEnv,
    result,
    windowEnv: typeof window !== 'undefined' ? window.__ENV : 'window未定义'
  });

  return result;
};

// 媒体下载服务后端API基础地址
export const BASE_API_URL = (
  getEnv('VITE_BASE_API_URL') || 'http://localhost:8000/'
).replace(/\/?$/, '/');

// 用户认证服务API地址
export const AUTH_API_URL = (
  getEnv('VITE_AUTH_API_URL') || 'http://localhost:8002/'
).replace(/\/?$/, '/');

// 用户登录页面地址
export const LOGIN_URL =
  getEnv('VITE_LOGIN_URL') ||
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/pages/auth/login` : '');

export const FRONTEND_USER_URL = getEnv('VITE_FRONTEND_USER_URL') ||
(typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');

// 其他配置常量
// 在现有配置中添加这一行
export const APP_BASE_PATH = getEnv('VITE_APP_BASE_PATH') || '/download-center/';

export const APP_TITLE = getEnv('VITE_APP_TITLE') || '媒体下载服务';
export const API_TIMEOUT = parseInt(getEnv('VITE_API_TIMEOUT')) || 30000;
export const POLLING_INTERVAL = parseInt(getEnv('VITE_POLLING_INTERVAL')) || 5000;
export const WS_URL = getEnv('VITE_WS_URL') || '';

// 调试：输出所有配置
console.log('API配置常量:', {
  BASE_API_URL,
  AUTH_API_URL,
  LOGIN_URL,
  APP_BASE_PATH,  // 👈 在调试输出中添加这一行
  APP_TITLE,
  API_TIMEOUT,
  POLLING_INTERVAL,
  WS_URL
});
