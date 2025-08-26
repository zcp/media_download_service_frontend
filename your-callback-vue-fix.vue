<template>
  <view class="callback-container">
    <!-- #ifdef H5 -->
    <view class="loading-wrapper">
      <uni-load-more status="loading" :content-text="loadingText" />
      <text class="loading-hint">正在处理第三方登录...</text>
    </view>
    <!-- #endif -->
    
    <!-- #ifndef H5 -->
    <view class="error-wrapper">
      <text class="error-text">当前平台不支持此功能</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { handleLoginCallback } from '@/api/authing'
import { ssoLogin } from '@/api/auth'

const userStore = useUserStore()
const loadingText = ref({
  contentdown: '处理中...',
  contentrefresh: '处理中...',
  contentnomore: '处理完成'
})

// ✨ 新增：处理外部应用回调的函数
const handleExternalCallback = (token: string): boolean => {
  console.log('🔄 检查外部回调状态...');
  
  // 检查是否有保存的外部回调信息
  const isExternalCallback = uni.getStorageSync('external_callback');
  const externalOrigin = uni.getStorageSync('external_origin');
  
  console.log('📊 外部回调检查:', { 
    isExternalCallback, 
    externalOrigin,
    hasToken: !!token 
  });
  
  if (isExternalCallback && externalOrigin && token) {
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
      return false;
    }
    
    // 构建回调URL
    const protocol = externalOrigin.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${externalOrigin}/simple-callback.html?token=${encodeURIComponent(token)}`;
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl);
    
    uni.showToast({
      title: '登录成功，正在跳转...',
      icon: 'success'
    });
    
    setTimeout(() => {
      console.log('🔄 执行外部跳转...');
      // #ifdef H5
      window.location.href = callbackUrl;
      // #endif
      // #ifndef H5
      uni.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(callbackUrl)}`
      });
      // #endif
    }, 1000);
    
    return true; // 表示已处理外部回调
  }
  
  console.log('🏠 没有外部回调，使用默认跳转');
  return false; // 没有外部回调，使用默认逻辑
}

// H5 回调处理
const handleCallback = async () => {
  // #ifdef H5
  try {
    console.log('开始处理 H5 第三方登录回调...')
    
    // ✨ 新增：在开始时检查存储状态
    console.log('📊 当前存储状态:', {
      external_callback: uni.getStorageSync('external_callback'),
      external_origin: uni.getStorageSync('external_origin'),
      redirect_after_login: uni.getStorageSync('redirect_after_login')
    });
    
    // 处理 Authing 回调，获取登录状态
    const loginState = await handleLoginCallback()
    
    if (loginState && loginState.idToken) {
      console.log('获取到 id_token，调用后端 SSO 登录接口...')
      
      // 调用后端 SSO 登录接口
      const loginResult = await ssoLogin(loginState.idToken)
      console.log('SSO 返回:', loginResult)
      
      // 保存 token 到 store
      await userStore.setTokens({
        access_token: loginResult.access_token,
        refresh_token: loginResult.refresh_token
      })
      
      // 获取用户信息
      await userStore.fetchUserProfile()
      
      console.log('SSO 登录成功！')
      
      // ✨ 新增：检查是否需要处理外部回调
      const isExternalCallback = handleExternalCallback(loginResult.access_token);
      
      if (!isExternalCallback) {
        // 原来的逻辑：内部跳转
        console.log('🏠 执行内部跳转');
        const redirectUrl = getRedirectUrl();
        uni.reLaunch({
          url: redirectUrl
        });
      }
      // 如果是外部回调，handleExternalCallback 函数已经处理了跳转
      
    } else {
      throw new Error('未获取到有效的登录凭证')
    }
  } catch (error) {
    console.error('第三方登录处理失败:', error)
    uni.showToast({
      title: '登录失败，请重试',
      icon: 'error'
    })
    
    // 跳转到登录页
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/auth/login'
      })
    }, 2000)
  }
  // #endif
  
  // #ifndef H5
  // 非 H5 平台直接跳转到首页
  uni.reLaunch({
    url: '/pages/index/index'
  })
  // #endif
}

// 获取重定向 URL
const getRedirectUrl = (): string => {
  // #ifdef H5
  // 尝试从 URL 参数中获取 redirect
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  
  if (redirect && redirect.startsWith('/')) {
    return redirect
  }
  // #endif
  
  // 第三方登录成功后跳转到用户资料页面
  return '/pages/user/profile'
}

// ✨ 新增：页面加载时的调试信息
onMounted(() => {
  console.log('🔍 Callback 页面加载');
  console.log('📊 页面加载时的存储状态:', {
    external_callback: uni.getStorageSync('external_callback'),
    external_origin: uni.getStorageSync('external_origin'),
    redirect_after_login: uni.getStorageSync('redirect_after_login')
  });
  
  handleCallback()
})
</script>

<style lang="scss" scoped>
@import '@/styles/global.scss';

.callback-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40rpx;
  background-color: #f8f9fa;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.loading-hint {
  font-size: 28rpx;
  color: #666;
  text-align: center;
}

.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-text {
  font-size: 32rpx;
  color: #999;
  text-align: center;
}

/* #ifdef H5 */
.callback-container {
  max-width: 600px;
  margin: 0 auto;
}
/* #endif */
</style>
