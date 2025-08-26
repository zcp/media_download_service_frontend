// 🔧 修复后的 uni-app 登录代码
// 请替换您的登录页面中相应的函数

// ============================================
// 修复1：第三方登录函数 - 使用正确的参数名
// ============================================

async function handleAppleLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始 Apple 登录...')
    
    // ✅ 修复：使用新的参数名
    const urlParams = getUrlParams()
    if (urlParams.external_callback && urlParams.origin) {
      uni.setStorageSync('external_callback', true)
      uni.setStorageSync('external_origin', urlParams.origin)
      console.log('💾 保存外部回调信息:', { external_callback: true, external_origin: urlParams.origin })
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index')
    }
    
    await loginWithAuthing()
  } catch (error) {
    console.error('Apple 登录失败:', error)
    uni.showToast({
      title: error?.message || 'Apple 登录失败',
      icon: 'error'
    })
    isLoading.value = false
  }
}

async function handleWechatH5Login() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始微信 H5 登录...')
    
    // ✅ 修复：使用新的参数名
    const urlParams = getUrlParams()
    if (urlParams.external_callback && urlParams.origin) {
      uni.setStorageSync('external_callback', true)
      uni.setStorageSync('external_origin', urlParams.origin)
      console.log('💾 保存外部回调信息:', { external_callback: true, external_origin: urlParams.origin })
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index')
    }
    
    await wechatLogin()
  } catch (error: any) {
    console.error('微信登录失败:', error)
    uni.showToast({
      title: error?.message || '微信登录失败',
      icon: 'error'
    })
    isLoading.value = false
  }
}

// handleGoogleLogin 已经是正确的，保持不变

// ============================================
// 修复2：onMounted 函数 - 设置 UI 显示状态
// ============================================

onMounted(() => {
  const urlParams = getUrlParams();
  
  console.log('🔍 页面参数检测:', urlParams);
  
  if (urlParams.external_callback) {
    console.log('🎯 检测到外部应用登录请求');
    console.log('📍 来源域名:', urlParams.origin);
    
    // ✅ 修复：设置外部登录显示状态
    isExternalLogin.value = true;
    
    // 显示提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    });
  }
});

// ============================================
// 修复3：需要在回调页面处理外部跳转
// ============================================

// 您需要在 pages/auth/callback.vue 中添加以下处理逻辑：

// 在 pages/auth/callback.vue 的 SSO 登录成功后添加：
function handleSSOLoginSuccess(loginResult) {
  // 保存 token 到 store（您现有的逻辑）
  userStore.setTokens({ 
    access_token: loginResult.access_token, 
    refresh_token: loginResult.refresh_token 
  });
  
  // ✅ 新增：检查是否有外部回调
  const isExternalCallback = uni.getStorageSync('external_callback');
  const externalOrigin = uni.getStorageSync('external_origin');
  
  console.log('🔍 检查外部回调状态:', { isExternalCallback, externalOrigin });
  
  if (isExternalCallback && externalOrigin) {
    // 清除保存的信息
    uni.removeStorageSync('external_callback');
    uni.removeStorageSync('external_origin');
    
    // 构建回调URL
    const protocol = externalOrigin.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${externalOrigin}/simple-callback.html?token=${encodeURIComponent(loginResult.access_token)}`;
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl);
    
    uni.showToast({
      title: '登录成功，正在跳转...',
      icon: 'success'
    });
    
    setTimeout(() => {
      // #ifdef H5
      window.location.href = callbackUrl;
      // #endif
    }, 1000);
    
    return; // 阻止默认跳转
  }
  
  // 原有的默认跳转逻辑
  uni.showToast({ icon: 'success', title: 'SSO 登录成功！' });
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/user/profile' });
  }, 400);
}
