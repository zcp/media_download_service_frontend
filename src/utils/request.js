// frontend/src/utils/request.js
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { ElMessage } from 'element-plus'

// 1. 创建 Axios 实例，支持环境变量配置
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 10000,
})

// 2. 自动重试机制
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error) || (error.response && error.response.status >= 500)
  },
})

// 3. 响应拦截器：统一错误处理
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    let errorMessage = '服务开小差了，请稍后重试'
    if (error.response) {
      const { data, status } = error.response
      if (data && typeof data === 'object') {
        errorMessage = data.message || `服务器错误 (${status})`
        if (data.data && typeof data.data === 'object') {
          const detail = Object.values(data.data).join('; ')
          errorMessage = `${errorMessage}: ${detail}`
        }
      } else {
        errorMessage = `服务器响应格式错误 (${status})`
      }
    } else if (error.request) {
      errorMessage = '网络连接失败，请检查您的网络'
    }
    ElMessage.error(errorMessage)
    return Promise.reject(error)
  }
)

export default axiosInstance
