<template>
  <view class="page-container">
    <view class="card">
      <view class="card-title">账户登录</view>
      
      <!-- ✨ 新增：外部应用登录提示 -->
      <view v-if="isExternalLogin" class="external-login-notice">
        <text class="notice-text">🔗 来自外部应用的登录请求</text>
        <text class="notice-desc">登录成功后将自动跳转回应用</text>
      </view>
      
      <uni-forms ref="formRef" :modelValue="formData" :rules="formRules">
        <uni-forms-item name="username">
          <uni-easyinput v-model="formData.username" placeholder="用户名/邮箱/手机号" prefixIcon="person" />
        </uni-forms-item>
        <uni-forms-item name="password">
          <uni-easyinput v-model="formData.password" type="password" placeholder="密码" prefixIcon="locked" />
        </uni-forms-item>
        <uni-forms-item name="captcha_solution">
          <view style="display:flex; gap:10px; align-items:center;">
            <uni-easyinput v-model="formData.captcha_solution" placeholder="请输入验证码" />
            <!-- #ifdef H5 -->
            <img :src="captchaSrc" class="captcha-img" @click="refreshCaptcha" alt="Captcha" />
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <image :src="captchaSrc" class="captcha-img" @click="refreshCaptcha" />
            <!-- #endif -->
          </view>
        </uni-forms-item>
        <button class="btn-primary" :loading="isLoading" :disabled="isLoading" @click="onSubmit">
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </uni-forms>
      
      <!-- 第三方登录区域 -->
      <view class="social-login-section">
        <view class="divider">
          <text class="divider-text">或通过以下方式登录</text>
        </view>
        <view class="social-buttons">
          <!-- #ifdef H5 -->
          <button class="social-btn apple-btn" @click="handleAppleLogin" :disabled="isLoading">
            <text class="social-btn-text">Apple 登录</text>
          </button>
          <button class="social-btn wechat-btn" @click="handleWechatH5Login" :disabled="isLoading">
            <text class="social-btn-text">微信登录</text>
          </button>
          <button class="social-btn google-btn" @click="handleGoogleLogin" :disabled="isLoading">
            <text class="social-btn-text">Google 登录</text>
          </button>
          <!-- #endif -->
          <!-- #ifdef MP-WEIXIN -->
          <button class="social-btn wechat-btn" @click="handleWechatLogin" :disabled="isLoading">
            <text class="social-btn-text">微信登录</text>
          </button>
          <!-- #endif -->
        </view>
      </view>

      <view style="margin-top: 16px; display:flex; justify-content: space-between;">
        <text class="text-secondary" @click="goRegister">立即注册</text>
        <text class="text-secondary" @click="goForget">忘记密码</text>
      </view>
    </view>
  </view>
  <uni-load-more v-if="isLoading" status="loading" />
</template>

<script setup lang="ts">
import { reactive, ref, watchEffect, onMounted } from 'vue'
import { API_PATHS } from '../../constants/api'
import { http } from '../../utils/request'
import { rules } from '../../utils/validator'
import { useUserStore } from '../../store/modules/user'
import { useCaptcha } from '../../composables/useCaptcha'

console.log('🎯 开始导入 authing 模块...')
import { loginWithAuthing, wxMiniLogin, wechatLogin, googleLogin } from '../../api/authing'
import { ssoLogin } from '../../api/auth'
console.log('✅ authing 模块导入完成', { loginWithAuthing, wxMiniLogin, wechatLogin, googleLogin })

console.log('🔥 登录页面 JavaScript 开始执行')

const userStore = useUserStore()

const formRef = ref()
const isLoading = ref(false)
const isExternalLogin = ref(false) // ✨ 新增：标识是否为外部应用登录

const formData = reactive({
  username: '',
  password: '',
  captcha_id: '',
  captcha_solution: '',
})

const formRules = {
  username: rules.username,
  password: rules.password,
  captcha_solution: rules.captcha,
}

const { captchaId, captchaSrc, refreshCaptcha } = useCaptcha()

// ✨ 新增：获取URL参数的函数
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    redirect_uri: urlParams.get('redirect_uri'),
    state: urlParams.get('state'),
  }
}

// ✨ 新增：处理外部应用回调的函数
function handleExternalCallback(token: string, userInfo: any = null): boolean {
  console.log('🔄 处理外部应用回调...')
  
  const urlParams = getUrlParams()
  const redirectUri = urlParams.redirect_uri
  
  console.log('📍 重定向URI:', redirectUri)
  console.log('🎫 Token:', token ? token.substring(0, 20) + '...' : '无')
  
  if (redirectUri) {
    try {
      // 验证 redirect_uri 是否合法（安全检查）
      const allowedDomains = [
        'localhost:3000',
        'localhost:3001', 
        'localhost:5173',
        '127.0.0.1:3000',
        '127.0.0.1:5173',
        // 添加您的生产域名
        // 'your-domain.com'
      ]
      
      const url = new URL(redirectUri)
      const isAllowed = allowedDomains.some(domain => 
        url.host === domain || url.hostname.endsWith(domain.replace('localhost', '127.0.0.1'))
      )
      
      if (!isAllowed) {
        console.error('❌ 不允许的重定向域名:', url.host)
        uni.showToast({
          title: '不允许的回调地址',
          icon: 'error'
        })
        return false
      }
      
      // 构建回调 URL，将 Token 作为参数传递
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('token', token)
      
      // 如果有状态参数，也传递回去
      if (urlParams.state) {
        callbackUrl.searchParams.set('state', urlParams.state)
      }
      
      // 如果有用户信息，也可以传递（可选）
      if (userInfo) {
        callbackUrl.searchParams.set('user', JSON.stringify(userInfo))
      }
      
      console.log('🚀 准备跳转到外部应用:', callbackUrl.toString())
      
      uni.showToast({
        title: '登录成功，正在跳转...',
        icon: 'success'
      })
      
      // 执行跳转到外部应用
      setTimeout(() => {
        // #ifdef H5
        window.location.href = callbackUrl.toString()
        // #endif
        // #ifndef H5
        uni.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(callbackUrl.toString())}`
        })
        // #endif
      }, 1000)
      
      return true // 表示已处理外部回调
      
    } catch (error) {
      console.error('❌ 处理回调失败:', error)
      uni.showToast({
        title: '回调处理失败',
        icon: 'error'
      })
      return false
    }
  }
  
  return false // 表示没有外部回调，使用默认逻辑
}

// ✨ 修改：原有的 onSubmit 函数，添加外部回调处理
async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }
  isLoading.value = true
  try {
    const resp = await http.post<typeof formData, any>(API_PATHS.auth.login, formData)
    if ((resp as any)?.data?.access_token) {
      userStore.setTokens({ 
        access_token: resp.data.access_token, 
        refresh_token: resp.data.refresh_token 
      })
      
      try {
        await userStore.fetchUserProfile()
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
      
      // ✨ 新增：检查是否需要处理外部回调
      const isExternalCallback = handleExternalCallback(
        resp.data.access_token, 
        resp.data.userInfo
      )
      
      if (!isExternalCallback) {
        // 原来的逻辑：跳转到内部页面
        uni.showToast({ icon: 'success', title: '登录成功' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/index/index' })
        }, 400)
      }
    }
  } catch (err: any) {
    uni.showToast({
      title: err?.data?.message || '登录失败，请稍后重试',
      icon: 'none',
    })
    refreshCaptcha()
  } finally {
    isLoading.value = false
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}

function goForget() {
  uni.navigateTo({ url: '/pages/auth/forget-password' })
}

// ✨ 修改：第三方登录处理函数，添加外部回调支持
async function handleAppleLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始 Apple 登录...')
    
    // ✨ 新增：保存外部回调信息
    const urlParams = getUrlParams()
    if (urlParams.redirect_uri) {
      uni.setStorageSync('external_redirect_uri', urlParams.redirect_uri)
      if (urlParams.state) {
        uni.setStorageSync('external_state', urlParams.state)
      }
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
    
    // ✨ 新增：保存外部回调信息
    const urlParams = getUrlParams()
    if (urlParams.redirect_uri) {
      uni.setStorageSync('external_redirect_uri', urlParams.redirect_uri)
      if (urlParams.state) {
        uni.setStorageSync('external_state', urlParams.state)
      }
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

async function handleGoogleLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始 Google 登录...')
    
    // ✨ 新增：保存外部回调信息
    const urlParams = getUrlParams()
    if (urlParams.redirect_uri) {
      uni.setStorageSync('external_redirect_uri', urlParams.redirect_uri)
      if (urlParams.state) {
        uni.setStorageSync('external_state', urlParams.state)
      }
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index')
    }
    
    await googleLogin()
  } catch (error: any) {
    console.error('Google 登录失败:', error)
    uni.showToast({
      title: error?.message || 'Google 登录失败',
      icon: 'error'
    })
    isLoading.value = false
  }
}

async function handleWechatLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始微信登录...')
    const idToken = await wxMiniLogin()
    await processSSOLogin(idToken)
  } catch (error) {
    console.error('微信登录失败:', error)
    uni.showToast({
      title: error?.message || '微信登录失败',
      icon: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// ✨ 修改：处理 SSO 登录，添加外部回调支持
async function processSSOLogin(idToken: string) {
  try {
    const loginResult = await ssoLogin(idToken)
    
    // 保存 token
    userStore.setTokens({ 
      access_token: loginResult.access_token, 
      refresh_token: loginResult.refresh_token 
    })
    
    // 获取用户信息
    try {
      await userStore.fetchUserProfile()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
    
    // ✨ 新增：检查是否需要处理外部回调
    const isExternalCallback = handleExternalCallback(
      loginResult.access_token,
      loginResult.userInfo
    )
    
    if (!isExternalCallback) {
      // 原来的逻辑：跳转到内部页面
      uni.showToast({ icon: 'success', title: '登录成功' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/user/profile' })
      }, 400)
    }
  } catch (error) {
    throw error
  }
}

// ✨ 新增：页面加载时检查外部回调参数
onMounted(() => {
  const urlParams = getUrlParams()
  
  if (urlParams.redirect_uri) {
    console.log('🎯 检测到外部应用登录请求')
    console.log('📍 回调地址:', urlParams.redirect_uri)
    
    isExternalLogin.value = true
    
    // 可以在UI上显示提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    })
  }
})

// 同步 captcha_id
watchEffect(() => { formData.captcha_id = captchaId.value })
</script>

<style lang="scss" scoped>
@use '../../styles/theme.scss' as *;
@import '@/styles/global.scss';

.page-container { 
  min-height: 100vh; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.card { 
  width: 88vw; 
}

// ✨ 新增：外部登录提示样式
.external-login-notice {
  margin-bottom: 32rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  text-align: center;
  
  .notice-text {
    display: block;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 600;
    margin-bottom: 8rpx;
  }
  
  .notice-desc {
    display: block;
    color: rgba(255, 255, 255, 0.8);
    font-size: 24rpx;
  }
}

// 第三方登录区域样式
.social-login-section {
  margin-top: 32rpx;
  margin-bottom: 16rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin: 32rpx 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #e5e7eb;
  }
}

.divider-text {
  padding: 0 16rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 12rpx;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  font-size: 28rpx;
  transition: all 0.2s ease;
  
  &:not(:disabled):active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.6;
    background-color: #f9fafb;
  }
}

.apple-btn {
  border-color: #000000;
  color: #000000;
  
  &:not(:disabled):hover {
    background-color: #000000;
    color: #ffffff;
  }
}

.wechat-btn {
  border-color: #07c160;
  color: #07c160;
  
  &:not(:disabled):hover {
    background-color: #07c160;
    color: #ffffff;
  }
}

.google-btn {
  border-color: #4285f4;
  color: #4285f4;
  
  &:not(:disabled):hover {
    background-color: #4285f4;
    color: #ffffff;
  }
}

.social-btn-text {
  font-weight: 500;
}

// PC端适配
@media (min-width: $breakpoint-sm) {
  .card { 
    max-width: 400px; 
    margin: 0 auto; 
  }
}
</style>
