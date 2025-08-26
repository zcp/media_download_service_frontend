// 🔧 简化版登录回调处理 - 解决URL编码问题
// 请将以下代码添加到您的 uni-app login.vue 中

// ============================================
// 第一步：在 <script setup> 开头添加这些函数
// ============================================

import { onMounted } from 'vue'

// 获取简化的URL参数
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    external_callback: urlParams.get('external_callback') === 'true',
    origin: urlParams.get('origin'), // 例如: 'localhost:3000'
    test: urlParams.get('test') // 用于测试
  };
}

// 处理外部应用回调（简化版）
function handleExternalCallback(token, userInfo = null) {
  console.log('🔄 处理外部应用回调...');
  
  const urlParams = getUrlParams();
  
  // 检查是否是外部回调请求
  if (!urlParams.external_callback || !urlParams.origin) {
    console.log('❌ 不是外部回调请求');
    return false;
  }
  
  try {
    // 安全检查：只允许指定域名
    const allowedOrigins = [
      'localhost:3000',
      'localhost:3001', 
      '127.0.0.1:3000',
      '127.0.0.1:3001',
      // 添加您的生产域名
    ];
    
    if (!allowedOrigins.includes(urlParams.origin)) {
      console.error('❌ 不允许的来源域名:', urlParams.origin);
      uni.showToast({
        title: '不允许的来源',
        icon: 'error'
      });
      return false;
    }
    
    // 构建回调URL
    const protocol = urlParams.origin.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${urlParams.origin}/simple-callback.html?token=${encodeURIComponent(token)}`;
    
    console.log('🚀 跳转到外部应用:', callbackUrl);
    
    uni.showToast({ 
      title: '登录成功，正在跳转...', 
      icon: 'success' 
    });
    
    // 跳转到外部应用
    setTimeout(() => {
      // #ifdef H5
      window.location.href = callbackUrl;
      // #endif
    }, 1000);
    
    return true; // 已处理外部回调
  } catch (error) {
    console.error('❌ 处理回调失败:', error);
    uni.showToast({
      title: '回调处理失败',
      icon: 'error'
    });
    return false;
  }
}

// ============================================
// 第二步：修改您现有的 onSubmit 函数
// ============================================

async function onSubmit() {
  try {
    await formRef.value?.validate();
  } catch (e) {
    return;
  }
  
  isLoading.value = true;
  
  try {
    const resp = await http.post<typeof formData, any>(API_PATHS.auth.login, formData);
    
    if ((resp as any)?.data?.access_token) {
      userStore.setTokens({ 
        access_token: resp.data.access_token, 
        refresh_token: resp.data.refresh_token 
      });
      
      try {
        await userStore.fetchUserProfile();
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
      
      // ✨ 新增：检查是否需要处理外部回调
      const isExternalCallback = handleExternalCallback(
        resp.data.access_token, 
        resp.data.userInfo
      );
      
      if (!isExternalCallback) {
        // 原来的逻辑：跳转到内部页面
        uni.showToast({ icon: 'success', title: '登录成功' });
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/index/index' });
        }, 400);
      }
    }
  } catch (err: any) {
    uni.showToast({
      title: err?.data?.message || '登录失败，请稍后重试',
      icon: 'none',
    });
    refreshCaptcha();
  } finally {
    isLoading.value = false;
  }
}

// ============================================
// 第三步：修改第三方登录函数
// ============================================

async function handleAppleLogin() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    console.log('开始 Apple 登录...');
    
    // ✨ 新增：保存外部回调信息
    const urlParams = getUrlParams();
    if (urlParams.external_callback && urlParams.origin) {
      uni.setStorageSync('external_callback', true);
      uni.setStorageSync('external_origin', urlParams.origin);
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index');
    }
    
    await loginWithAuthing();
  } catch (error) {
    console.error('Apple 登录失败:', error);
    uni.showToast({
      title: error?.message || 'Apple 登录失败',
      icon: 'error'
    });
    isLoading.value = false;
  }
}

// 对其他第三方登录函数做相同修改
async function handleWechatH5Login() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    console.log('开始微信 H5 登录...');
    
    const urlParams = getUrlParams();
    if (urlParams.external_callback && urlParams.origin) {
      uni.setStorageSync('external_callback', true);
      uni.setStorageSync('external_origin', urlParams.origin);
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index');
    }
    
    await wechatLogin();
  } catch (error: any) {
    console.error('微信登录失败:', error);
    uni.showToast({
      title: error?.message || '微信登录失败',
      icon: 'error'
    });
    isLoading.value = false;
  }
}

async function handleGoogleLogin() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    console.log('开始 Google 登录...');
    
    const urlParams = getUrlParams();
    if (urlParams.external_callback && urlParams.origin) {
      uni.setStorageSync('external_callback', true);
      uni.setStorageSync('external_origin', urlParams.origin);
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index');
    }
    
    await googleLogin();
  } catch (error: any) {
    console.error('Google 登录失败:', error);
    uni.showToast({
      title: error?.message || 'Google 登录失败',
      icon: 'error'
    });
    isLoading.value = false;
  }
}

// ============================================
// 第四步：修改 processSSOLogin 函数
// ============================================

async function processSSOLogin(idToken: string) {
  try {
    const loginResult = await ssoLogin(idToken);
    
    userStore.setTokens({ 
      access_token: loginResult.access_token, 
      refresh_token: loginResult.refresh_token 
    });
    
    try {
      await userStore.fetchUserProfile();
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
    
    // ✨ 新增：检查是否需要处理外部回调
    const isExternalCallback = handleExternalCallback(
      loginResult.access_token,
      loginResult.userInfo
    );
    
    if (!isExternalCallback) {
      uni.showToast({ icon: 'success', title: '登录成功' });
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/user/profile' });
      }, 400);
    }
  } catch (error) {
    throw error;
  }
}

// ============================================
// 第五步：添加页面加载检测
// ============================================

onMounted(() => {
  const urlParams = getUrlParams();
  
  console.log('🔍 页面参数检测:', urlParams);
  
  if (urlParams.external_callback) {
    console.log('🎯 检测到外部应用登录请求');
    console.log('📍 来源域名:', urlParams.origin);
    
    // 可选：显示提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    });
  }
});

// ============================================
// 第六步：处理第三方登录回调（如果有独立的回调页面）
// ============================================

export function handleThirdPartyCallback(token, userInfo) {
  // 检查是否有保存的外部回调信息
  const isExternalCallback = uni.getStorageSync('external_callback');
  const externalOrigin = uni.getStorageSync('external_origin');
  
  if (isExternalCallback && externalOrigin) {
    // 清除保存的信息
    uni.removeStorageSync('external_callback');
    uni.removeStorageSync('external_origin');
    
    // 构建回调URL并跳转
    const protocol = externalOrigin.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${externalOrigin}/simple-callback.html?token=${encodeURIComponent(token)}`;
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl);
    
    setTimeout(() => {
      // #ifdef H5
      window.location.href = callbackUrl;
      // #endif
    }, 1000);
    
    return true;
  }
  
  return false; // 使用默认逻辑
}
