// 这是对您的 login.vue 的修改建议
// 请将以下代码整合到您的 login.vue 中

// 1. 在 <script setup> 的开始部分添加以下代码：

import { onMounted } from 'vue'

// 获取URL参数的函数
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    redirect_uri: urlParams.get('redirect_uri'),
    state: urlParams.get('state'),
    // 其他可能的参数
  }
}

// 处理外部应用回调的函数
function handleExternalCallback(token, userInfo = null) {
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
        url.host === domain || url.hostname.endsWith(domain)
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
      }, 500)
      
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

// 2. 修改现有的登录成功处理函数

// 修改 onSubmit 函数：
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

// 修改第三方登录处理函数
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

// 同样修改其他第三方登录函数
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

// 修改 processSSOLogin 函数
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
    const urlParams = getUrlParams()
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

// 3. 在页面加载时检查外部回调参数
onMounted(() => {
  const urlParams = getUrlParams()
  
  if (urlParams.redirect_uri) {
    console.log('🎯 检测到外部应用登录请求')
    console.log('📍 回调地址:', urlParams.redirect_uri)
    
    // 可以在UI上显示提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    })
  }
})

// 4. 如果您有回调页面处理，也需要修改
// 在您的 callback 页面或者 authing 相关处理中：

export function handleAuthingCallback(token, userInfo) {
  // 检查是否有保存的外部回调信息
  const externalRedirectUri = uni.getStorageSync('external_redirect_uri')
  const externalState = uni.getStorageSync('external_state')
  
  if (externalRedirectUri) {
    // 清除保存的信息
    uni.removeStorageSync('external_redirect_uri')
    uni.removeStorageSync('external_state')
    
    // 构建回调URL
    const callbackUrl = new URL(externalRedirectUri)
    callbackUrl.searchParams.set('token', token)
    
    if (externalState) {
      callbackUrl.searchParams.set('state', externalState)
    }
    
    if (userInfo) {
      callbackUrl.searchParams.set('user', JSON.stringify(userInfo))
    }
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl.toString())
    
    // 跳转到外部应用
    // #ifdef H5
    window.location.href = callbackUrl.toString()
    // #endif
    
    return true // 表示已处理
  }
  
  return false // 使用默认逻辑
}
