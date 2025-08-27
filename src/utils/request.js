/**
 * HTTP请求封装
 * 基于Axios实现统一的请求处理、错误处理和认证
 */
import axios from 'axios';
import { ElMessage, ElLoading } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { isTokenValid, removeStoredToken } from '@/utils/auth';
import { BASE_API_URL, API_TIMEOUT, LOGIN_URL } from '@/constants/api';

// 创建axios实例
const request = axios.create({
  baseURL: BASE_API_URL, // 使用配置文件中的API地址
  timeout: API_TIMEOUT, // 使用配置文件中的超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 全局loading实例
let loadingInstance = null;
let requestCount = 0;

/**
 * 显示全局loading
 */
function showLoading() {
  if (requestCount === 0) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载中...',
      background: 'rgba(0, 0, 0, 0.7)',
    });
  }
  requestCount++;
}

/**
 * 隐藏全局loading
 */
function hideLoading() {
  requestCount--;
  if (requestCount <= 0) {
    requestCount = 0;
    if (loadingInstance) {
      loadingInstance.close();
      loadingInstance = null;
    }
  }
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 自动添加Authorization头
    const token = localStorage.getItem('jwt_token');
    if (token && isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 显示loading（排除某些不需要loading的请求）
    if (!config.hideLoading) {
      showLoading();
    }
    
    console.log('发送请求:', config.method?.toUpperCase(), config.url, config.data || config.params);
    return config;
  },
  (error) => {
    hideLoading();
    console.error('请求配置错误:', error);
    ElMessage.error('请求配置错误');
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    hideLoading();
    
    console.log('收到响应:', response.config.method?.toUpperCase(), response.config.url, response.data);
    
    // 根据后端统一响应格式处理
    const { code, message, data } = response.data;
    
    // 处理成功状态码：200(成功)、201(创建成功)、204(无内容)
    if (code === 200 || code === 201 || code === 204) {
      return data; // 成功时直接返回data部分
    } else {
      // 业务错误
      console.error('业务错误:', code, message);
      ElMessage.error(message || '请求失败');
      return Promise.reject(new Error(message || '请求失败'));
    }
  },
  (error) => {
    hideLoading();
    
    console.error('请求错误:', error);
    
    // HTTP状态码错误处理
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // 认证失败，清除本地认证信息并跳转登录
          const authStore = useAuthStore();
          authStore.clearAuth();
          removeStoredToken();
          authStore.setRedirectPath(window.location.pathname);
          
          ElMessage.error('登录已过期，请重新登录');
          setTimeout(() => {
            window.location.href = LOGIN_URL;
          }, 1000);
          break;
          
        case 403:
          ElMessage.error('没有权限访问该资源');
          break;
          
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
          
        case 500:
          ElMessage.error('服务器内部错误');
          break;
          
        default:
          const errorMessage = data?.message || `请求失败 (${status})`;
          ElMessage.error(errorMessage);
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接');
    } else if (error.message === 'Network Error') {
      ElMessage.error('网络连接错误，请检查网络');
    } else {
      ElMessage.error(error.message || '未知错误');
    }
    
    return Promise.reject(error);
  }
);

/**
 * 通用GET请求
 * @param {string} url - 请求URL
 * @param {object} params - 查询参数
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function get(url, params = {}, config = {}) {
  return request.get(url, {
    params,
    ...config,
  });
}

/**
 * 通用POST请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求数据
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function post(url, data = {}, config = {}) {
  return request.post(url, data, config);
}

/**
 * 通用PUT请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求数据
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function put(url, data = {}, config = {}) {
  return request.put(url, data, config);
}

/**
 * 通用DELETE请求
 * @param {string} url - 请求URL
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function del(url, config = {}) {
  return request.delete(url, config);
}

/**
 * 分页请求辅助函数
 * @param {string} url - 请求URL
 * @param {object} params - 分页参数 {page, size, sort, ...其他筛选参数}
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function getWithPagination(url, params = {}, config = {}) {
  const { page = 1, size = 20, sort, ...otherParams } = params;
  
  const queryParams = {
    page,
    size,
    ...otherParams,
  };
  
  if (sort) {
    queryParams.sort = sort;
  }
  
  return get(url, queryParams, config);
}

/**
 * 上传文件请求
 * @param {string} url - 上传URL
 * @param {FormData} formData - 文件数据
 * @param {object} config - 请求配置
 * @returns {Promise} - 请求Promise
 */
export function upload(url, formData, config = {}) {
  return request.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config,
  });
}

/**
 * 导出文件请求
 * @param {string} url - 导出URL
 * @param {object} params - 查询参数
 * @param {string} filename - 文件名
 * @returns {Promise} - 请求Promise
 */
export function exportFile(url, params = {}, filename = 'download') {
  return request.get(url, {
    params,
    responseType: 'blob',
    hideLoading: false, // 导出时显示loading
  }).then((blob) => {
    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  });
}

// 导出request实例，供特殊场景使用
export default request;