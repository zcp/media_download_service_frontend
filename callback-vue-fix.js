// 🔧 修复 pages/auth/callback.vue 的处理逻辑
// 请在您的 callback.vue 文件中替换相应的处理代码

// 在您的 callback.vue 的 SSO 登录成功处理中，替换这部分：

// 原来的代码（需要替换）：
/*
uni.showToast({ icon: 'success', title: 'SSO 登录成功！' });
setTimeout(() => {
  uni.reLaunch({ url: '/pages/user/profile' });
}, 400);
*/

// ✅ 新的处理逻辑（替换上面的代码）：
function handleSSOLoginSuccess(ssoResult) {
  console.log('🔄 处理 SSO 登录成功回调...');
  console.log('📊 SSO 结果:', ssoResult);
  
  // 保存 token 到 store
  userStore.setTokens({ 
    access_token: ssoResult.access_token, 
    refresh_token: ssoResult.refresh_token 
  });
  
  try {
    // 获取用户信息（如果需要）
    // await userStore.fetchUserProfile();
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
  
  // ✅ 检查是否有外部回调
  const isExternalCallback = uni.getStorageSync('external_callback');
  const externalOrigin = uni.getStorageSync('external_origin');
  
  console.log('🔍 检查外部回调状态:', { 
    isExternalCallback, 
    externalOrigin,
    hasToken: !!ssoResult.access_token 
  });
  
  if (isExternalCallback && externalOrigin && ssoResult.access_token) {
    console.log('✅ 检测到外部回调，准备跳转...');
    
    // 清除保存的信息
    uni.removeStorageSync('external_callback');
    uni.removeStorageSync('external_origin');
    
    // 验证来源域名安全性
    const allowedOrigins = [
      'localhost:3000',
      'localhost:3001', 
      '127.0.0.1:3000',
      '127.0.0.1:3001',
      // 添加您的生产域名
    ];
    
    if (!allowedOrigins.includes(externalOrigin)) {
      console.error('❌ 不允许的来源域名:', externalOrigin);
      uni.showToast({
        title: '不允许的来源',
        icon: 'error'
      });
      return;
    }
    
    // 构建回调URL
    const protocol = externalOrigin.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${externalOrigin}/simple-callback.html?token=${encodeURIComponent(ssoResult.access_token)}`;
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl);
    
    uni.showToast({
      title: '登录成功，正在跳转...',
      icon: 'success'
    });
    
    setTimeout(() => {
      console.log('🔄 执行跳转...');
      // #ifdef H5
      window.location.href = callbackUrl;
      // #endif
      // #ifndef H5
      uni.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(callbackUrl)}`
      });
      // #endif
    }, 1000);
    
    return; // 阻止默认跳转
  }
  
  console.log('🏠 没有外部回调，使用默认跳转');
  
  // 原有的默认跳转逻辑
  uni.showToast({ icon: 'success', title: 'SSO 登录成功！' });
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/user/profile' });
  }, 400);
}

// ============================================
// 完整的替换示例（基于您提供的日志）
// ============================================

// 在您的 callback.vue 中，找到类似这样的代码：
/*
console.log('SSO 登录成功！');
// 在这里添加处理外部回调的逻辑
*/

// 替换为：
console.log('SSO 登录成功！');

// 调用处理函数
handleSSOLoginSuccess({
  access_token: ssoResult.access_token,
  refresh_token: ssoResult.refresh_token,
  token_type: ssoResult.token_type
});

// ============================================
// 调试建议：添加更多日志
// ============================================

// 在 callback.vue 的开始处添加调试日志：
onMounted(() => {
  console.log('🔍 Callback 页面加载');
  console.log('📊 当前存储状态:', {
    external_callback: uni.getStorageSync('external_callback'),
    external_origin: uni.getStorageSync('external_origin'),
    redirect_after_login: uni.getStorageSync('redirect_after_login')
  });
});

// 在处理 SSO 之前添加：
console.log('开始处理 SSO 登录...');
console.log('📊 存储检查:', {
  external_callback: uni.getStorageSync('external_callback'),
  external_origin: uni.getStorageSync('external_origin')
});
