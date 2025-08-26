// 最小化修改方案 - 只需要在您的 uni-app login.vue 中添加这些代码

// ============================================
// 第一步：在 <script setup> 开头添加这些函数
// ============================================

import { onMounted } from 'vue'

// 获取URL参数
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    redirect_uri: urlParams.get('redirect_uri'),
    state: urlParams.get('state'),
  }
}

// 处理外部应用回调（核心函数）
function handleExternalCallback(token, userInfo = null) {
  console.log('🔄 处理外部应用回调...')
  
  const urlParams = getUrlParams()
  const redirectUri = urlParams.redirect_uri
  
  if (redirectUri) {
    try {
      // 安全检查：只允许指定域名
      const allowedDomains = [
        'localhost:3000',
        'localhost:3001', 
        'localhost:5173',
        '127.0.0.1:3000',
        '127.0.0.1:5173',
        // 添加您的生产域名
      ]
      
      const url = new URL(redirectUri)
      const isAllowed = allowedDomains.some(domain => url.host === domain)
      
      if (!isAllowed) {
        console.error('❌ 不允许的重定向域名:', url.host)
        return false
      }
      
      // 构建回调URL
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('token', token)
      
      if (urlParams.state) {
        callbackUrl.searchParams.set('state', urlParams.state)
      }
      
      console.log('🚀 跳转到外部应用:', callbackUrl.toString())
      
      uni.showToast({ title: '登录成功，正在跳转...', icon: 'success' })
      
      // 跳转到外部应用
      setTimeout(() => {
        // #ifdef H5
        window.location.href = callbackUrl.toString()
        // #endif
      }, 1000)
      
      return true // 已处理外部回调
    } catch (error) {
      console.error('❌ 处理回调失败:', error)
      return false
    }
  }
  
  return false // 没有外部回调，使用默认逻辑
}

// ============================================
// 第二步：修改您现有的 onSubmit 函数
// ============================================

// 在您现有的 onSubmit 函数中，找到登录成功的部分，添加回调处理：

async function onSubmit() {
  // ... 您现有的代码 ...
  
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
      
      // ✨ 添加这部分：检查是否需要处理外部回调
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
  } catch (err) {
    // ... 您现有的错误处理 ...
  }
}

// ============================================
// 第三步：修改您现有的第三方登录函数
// ============================================

// 在每个第三方登录函数的开头添加外部回调信息保存：

async function handleAppleLogin() {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始 Apple 登录...')
    
    // ✨ 添加这部分：保存外部回调信息
    const urlParams = getUrlParams()
    if (urlParams.redirect_uri) {
      uni.setStorageSync('external_redirect_uri', urlParams.redirect_uri)
      if (urlParams.state) {
        uni.setStorageSync('external_state', urlParams.state)
      }
    } else {
      uni.setStorageSync('redirect_after_login', '/pages/index/index')
    }
    
    await loginWithAuthing() // 您现有的代码
  } catch (error) {
    // ... 您现有的错误处理 ...
  }
}

// 对其他第三方登录函数（handleWechatH5Login, handleGoogleLogin）做同样的修改

// ============================================
// 第四步：修改 processSSOLogin 函数
// ============================================

async function processSSOLogin(idToken: string) {
  try {
    const loginResult = await ssoLogin(idToken)
    
    // 保存 token
    userStore.setTokens({ 
      access_token: loginResult.access_token, 
      refresh_token: loginResult.refresh_token 
    })
    
    try {
      await userStore.fetchUserProfile()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
    
    // ✨ 添加这部分：检查是否需要处理外部回调
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

// ============================================
// 第五步：在页面加载时检查外部回调参数
// ============================================

// 在您现有的代码中添加 onMounted：

onMounted(() => {
  const urlParams = getUrlParams()
  
  if (urlParams.redirect_uri) {
    console.log('🎯 检测到外部应用登录请求')
    console.log('📍 回调地址:', urlParams.redirect_uri)
    
    // 可选：显示提示
    uni.showToast({
      title: '来自外部应用的登录请求',
      icon: 'none',
      duration: 2000
    })
  }
})

// ============================================
// 第六步：如果您有 Authing 回调页面，也需要类似处理
// ============================================

// 在您的 Authing 回调处理中（如果有独立的回调页面）：
function onAuthingSuccess(token, userInfo) {
  // 检查是否有保存的外部回调信息
  const externalRedirectUri = uni.getStorageSync('external_redirect_uri')
  const externalState = uni.getStorageSync('external_state')
  
  if (externalRedirectUri) {
    // 清除保存的信息
    uni.removeStorageSync('external_redirect_uri')
    uni.removeStorageSync('external_state')
    
    // 构建回调URL并跳转
    const callbackUrl = new URL(externalRedirectUri)
    callbackUrl.searchParams.set('token', token)
    
    if (externalState) {
      callbackUrl.searchParams.set('state', externalState)
    }
    
    console.log('🚀 第三方登录成功，跳转到外部应用:', callbackUrl.toString())
    
    setTimeout(() => {
      // #ifdef H5
      window.location.href = callbackUrl.toString()
      // #endif
    }, 1000)
    
    return true
  }
  
  return false // 使用默认逻辑
}
