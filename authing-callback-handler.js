// 用于处理 Authing 登录回调的通用函数
// 请将此代码添加到您的 authing.js 或相关文件中

/**
 * 处理 Authing 登录成功后的回调
 * @param {string} token - 登录成功后获得的访问令牌
 * @param {object} userInfo - 用户信息（可选）
 * @returns {boolean} - 是否处理了外部应用回调
 */
export function handleAuthingCallback(token, userInfo = null) {
  console.log('🔄 处理 Authing 登录回调...')
  
  // 检查是否有保存的外部回调信息
  const externalRedirectUri = uni.getStorageSync('external_redirect_uri')
  const externalState = uni.getStorageSync('external_state')
  
  console.log('📍 保存的外部回调信息:', { externalRedirectUri, externalState })
  
  if (externalRedirectUri) {
    try {
      // 清除保存的信息
      uni.removeStorageSync('external_redirect_uri')
      uni.removeStorageSync('external_state')
      
      // 验证回调地址安全性
      const allowedDomains = [
        'localhost:3000',
        'localhost:3001', 
        'localhost:5173',
        '127.0.0.1:3000',
        '127.0.0.1:5173',
		// 添加生产环境域名
		'124.220.235.226',
		'dev.lancet.im'
        // 添加您的生产域名
        // 'your-domain.com'
      ]
      
      const url = new URL(externalRedirectUri)
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
      
      uni.showToast({
        title: '登录成功，正在跳转...',
        icon: 'success'
      })
      
      // 跳转到外部应用
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
      console.error('❌ 处理 Authing 回调失败:', error)
      uni.showToast({
        title: '回调处理失败',
        icon: 'error'
      })
      return false
    }
  }
  
  return false // 没有外部回调，使用默认逻辑
}

/**
 * 在 Authing 登录成功的地方调用此函数
 * 例如在您的 callback 页面或 authing API 响应处理中
 */
export function onAuthingLoginSuccess(loginResult) {
  const { access_token, userInfo, ...rest } = loginResult
  
  // 处理外部应用回调
  const isExternalCallback = handleAuthingCallback(access_token, userInfo)
  
  if (!isExternalCallback) {
    // 使用原有的内部跳转逻辑
    console.log('🏠 使用默认内部跳转逻辑')
    
    // 保存用户信息到 store
    if (typeof useUserStore === 'function') {
      const userStore = useUserStore()
      userStore.setTokens({ access_token, refresh_token: loginResult.refresh_token })
      
      if (userInfo) {
        userStore.setUserInfo(userInfo)
      }
    }
    
    // 跳转到默认页面
    uni.showToast({ icon: 'success', title: '登录成功' })
    setTimeout(() => {
      const redirectPage = uni.getStorageSync('redirect_after_login') || '/pages/index/index'
      uni.removeStorageSync('redirect_after_login')
      uni.reLaunch({ url: redirectPage })
    }, 500)
  }
  
  return isExternalCallback
}

// 使用示例：
// 在您的 Authing 回调处理中：
/*
// pages/auth/callback.vue 或类似的回调页面
import { onAuthingLoginSuccess } from './authing-callback-handler'

export default {
  onLoad(options) {
    const { code, state } = options
    
    // 使用 code 换取 token
    this.handleAuthingCode(code).then(loginResult => {
      // 使用统一的回调处理
      onAuthingLoginSuccess(loginResult)
    })
  },
  
  async handleAuthingCode(code) {
    // 您的 Authing code 换取 token 的逻辑
    const response = await authingAPI.exchangeCodeForToken(code)
    return response.data
  }
}
*/
