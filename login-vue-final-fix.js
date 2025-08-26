// 🔧 login.vue 中需要修复的关键代码
// 请在您的 login.vue 中修复以下函数：

// ============================================
// 修复1：handleAppleLogin 函数
// ============================================
async function handleAppleLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始 Apple 登录...')
    
    // ✅ 修复：使用正确的参数名
    const urlParams = getUrlParams()
    if (urlParams.external_callback && urlParams.origin) {
      console.log('💾 保存外部回调信息:', { external_callback: true, external_origin: urlParams.origin })
      uni.setStorageSync('external_callback', true)
      uni.setStorageSync('external_origin', urlParams.origin)
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

// ============================================
// 修复2：handleWechatH5Login 函数
// ============================================
async function handleWechatH5Login() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始微信 H5 登录...')
    
    // ✅ 修复：使用正确的参数名
    const urlParams = getUrlParams()
    if (urlParams.external_callback && urlParams.origin) {
      console.log('💾 保存外部回调信息:', { external_callback: true, external_origin: urlParams.origin })
      uni.setStorageSync('external_callback', true)
      uni.setStorageSync('external_origin', urlParams.origin)
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

// ============================================
// 修复3：onMounted 函数
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
// 注意：handleGoogleLogin 已经是正确的，保持不变
// ============================================
