// uni-app 登录项目中需要添加的回调处理逻辑
// 这个文件需要复制到您的 uni-app 登录项目中

/**
 * 处理第三方应用的登录回调
 * 在登录成功后调用此函数
 */
export function handleExternalCallback(token, userInfo) {
  console.log('🔄 处理外部应用回调...');
  
  // 从 URL 参数中获取 redirect_uri
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');
  
  console.log('📍 重定向URI:', redirectUri);
  console.log('🎫 Token:', token ? token.substring(0, 20) + '...' : '无');
  
  if (redirectUri) {
    try {
      // 验证 redirect_uri 是否合法（安全检查）
      const allowedDomains = [
        'localhost:3000',
        'localhost:3001', 
        'localhost:5173',
        // 添加您的生产域名
        'your-domain.com'
      ];
      
      const url = new URL(redirectUri);
      const isAllowed = allowedDomains.some(domain => 
        url.host === domain || url.hostname.endsWith(domain)
      );
      
      if (!isAllowed) {
        console.error('❌ 不允许的重定向域名:', url.host);
        return;
      }
      
      // 构建回调 URL，将 Token 作为参数传递
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('token', token);
      
      // 如果有用户信息，也可以传递
      if (userInfo) {
        callbackUrl.searchParams.set('user', JSON.stringify(userInfo));
      }
      
      console.log('🚀 准备跳转到:', callbackUrl.toString());
      
      // 执行跳转
      window.location.href = callbackUrl.toString();
      
    } catch (error) {
      console.error('❌ 处理回调失败:', error);
    }
  } else {
    console.log('⚠️ 没有 redirect_uri，保持在当前页面');
  }
}

/**
 * 在 uni-app 的登录页面中使用的示例代码
 */
export function integrateWithUniApp() {
  // 这是需要在您的 uni-app 登录页面中添加的代码示例
  
  return `
// 在您的 uni-app 登录页面的成功回调中添加：

// 1. 导入处理函数
import { handleExternalCallback } from './callback-handler.js';

// 2. 在登录成功的地方调用
onLoginSuccess(token, userInfo) {
  console.log('✅ 登录成功');
  
  // 处理外部应用回调
  handleExternalCallback(token, userInfo);
  
  // 如果没有外部回调，执行原有逻辑
  // ... 您原来的登录成功处理逻辑
}

// 3. 在页面加载时检查是否有 redirect_uri
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');
  
  if (redirectUri) {
    console.log('🎯 检测到外部应用回调请求:', redirectUri);
    // 可以在 UI 上显示提示，告诉用户这是来自外部应用的登录请求
  }
});
`;
}
