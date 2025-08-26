// 环境变量配置文件 - 支持多环境部署
// 请根据实际部署环境修改这些值

// 注意：这个文件通过 script 标签直接引入，不使用 ES6 模块语法
(function() {
  const ENV_CONFIG = {
    // ===== 媒体下载服务后端API地址 =====
    VITE_BASE_API_URL: 'http://localhost:8001/',
    
    // ===== 用户认证服务地址 =====
    VITE_AUTH_API_URL: 'http://localhost:8002/',
    
    // ===== 用户登录页面地址 =====
    VITE_LOGIN_URL: 'http://localhost:5173/pages/auth/login',
    
    // ===== 其他配置 =====
    VITE_APP_TITLE: '媒体下载服务',
    VITE_API_TIMEOUT: '30000',
    VITE_POLLING_INTERVAL: '5000',
    
    // ===== WebSocket配置（可选）=====
    VITE_WS_URL: 'ws://localhost:8001/ws',
  };

  // 导出到全局供 constants/api.js 读取
  if (typeof window !== 'undefined') {
    window.__ENV = ENV_CONFIG;
    
    // 调试：输出配置到控制台
    console.log('环境配置已加载:', ENV_CONFIG);
  }
})();
