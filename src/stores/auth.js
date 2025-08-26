/**
 * 认证状态管理
 * 基于Pinia实现JWT Token认证状态管理
 */
import { defineStore } from 'pinia';
import { 
  isTokenValid, 
  parseUserFromToken, 
  getTokenExpiry, 
  getStoredToken,
  setStoredToken,
  removeStoredToken 
} from '@/utils/auth';
import { LOGIN_URL } from '@/constants/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,              // 用户信息
    token: null,             // JWT Token
    isAuthenticated: false,  // 认证状态
    tokenExpiry: null,       // Token过期时间
    redirectPath: null,      // 登录前的目标路径
  }),
  
  getters: {
    /**
     * 检查Token是否有效
     */
    isTokenValidGetter: (state) => {
      return state.token ? isTokenValid(state.token) : false;
    },
    
    /**
     * 获取用户ID
     */
    userId: (state) => {
      return state.user?.user_id || null;
    },
    
    /**
     * 获取用户名
     */
    username: (state) => {
      return state.user?.username || '';
    },
    
    /**
     * 获取用户邮箱
     */
    userEmail: (state) => {
      return state.user?.email || '';
    },
    
    /**
     * 检查是否需要重新登录
     */
    needsReauth: (state) => {
      return !state.isAuthenticated || !isTokenValid(state.token);
    }
  },
  
  actions: {
    /**
     * 设置Token和用户信息
     * @param {string} token - JWT Token
     */
    setToken(token) {
      if (!token || !isTokenValid(token)) {
        console.warn('尝试设置无效的Token');
        return false;
      }
      
      try {
        // 解析用户信息
        const userInfo = parseUserFromToken(token);
        if (!userInfo) {
          throw new Error('无法解析用户信息');
        }
        
        // 更新状态
        this.token = token;
        this.user = userInfo;
        this.tokenExpiry = getTokenExpiry(token);
        this.isAuthenticated = true;
        
        // 保存到localStorage
        setStoredToken(token);
        
        console.log('Token设置成功:', userInfo);
        return true;
      } catch (error) {
        console.error('设置Token失败:', error);
        this.clearAuth();
        return false;
      }
    },
    
    /**
     * 清除认证信息
     */
    clearAuth() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.tokenExpiry = null;
      
      // 清除localStorage
      removeStoredToken();
      
      console.log('认证信息已清除');
    },
    
    /**
     * 设置重定向路径
     * @param {string} path - 目标路径
     */
    setRedirectPath(path) {
      this.redirectPath = path;
      
      // 保存到sessionStorage，页面刷新后仍可用
      try {
        sessionStorage.setItem('auth_redirect_path', path);
      } catch (error) {
        console.warn('保存重定向路径失败:', error);
      }
    },
    
    /**
     * 获取重定向路径
     * @returns {string|null} - 重定向路径
     */
    getRedirectPath() {
      if (this.redirectPath) {
        return this.redirectPath;
      }
      
      // 从sessionStorage获取
      try {
        return sessionStorage.getItem('auth_redirect_path');
      } catch (error) {
        console.warn('获取重定向路径失败:', error);
        return null;
      }
    },
    
    /**
     * 清除重定向路径
     */
    clearRedirectPath() {
      this.redirectPath = null;
      
      try {
        sessionStorage.removeItem('auth_redirect_path');
      } catch (error) {
        console.warn('清除重定向路径失败:', error);
      }
    },
    
    /**
     * 初始化认证状态
     * 应用启动时调用，从localStorage恢复认证状态
     */
    async initializeAuth() {
      console.log('初始化认证状态...');
      
      try {
        const savedToken = getStoredToken();
        
        if (!savedToken) {
          console.log('未找到保存的Token');
          return false;
        }
        
        if (isTokenValid(savedToken)) {
          // Token有效，恢复认证状态
          const success = this.setToken(savedToken);
          if (success) {
            console.log('认证状态恢复成功');
            return true;
          }
        } else {
          console.log('保存的Token已过期');
        }
        
        // Token无效或过期，清除认证信息
        this.clearAuth();
        return false;
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        this.clearAuth();
        return false;
      }
    },
    
    /**
     * 检查Token过期状态
     * @returns {boolean} - true表示未过期，false表示已过期
     */
    checkTokenExpiry() {
      if (!this.token) {
        console.log('Token检查：无Token');
        return false;
      }
      
      const valid = isTokenValid(this.token);
      
      if (!valid) {
        console.log('Token检查：已过期');
        this.clearAuth();
      }
      
      return valid;
    },
    
    /**
     * 解析Token中的用户信息
     * @param {string} token - JWT Token
     */
    parseUserFromToken(token) {
      try {
        const userInfo = parseUserFromToken(token);
        if (userInfo) {
          this.user = userInfo;
          console.log('用户信息解析成功:', userInfo);
        } else {
          throw new Error('解析失败');
        }
      } catch (error) {
        console.error('解析Token用户信息失败:', error);
        this.clearAuth();
      }
    },
    
    /**
     * 处理认证后的重定向
     * 登录成功后调用，跳转到登录前的目标页面
     */
    handleAuthRedirect() {
      const redirectPath = this.getRedirectPath();
      
      if (redirectPath && redirectPath !== '/login') {
        console.log('重定向到:', redirectPath);
        this.clearRedirectPath();
        
        // 使用router实例进行导航
        const router = this.$router || window.$router;
        if (router) {
          router.push(redirectPath);
        } else {
          // 降级方案：直接修改location
          window.location.href = redirectPath;
        }
      } else {
        console.log('重定向到默认页面');
        
        const router = this.$router || window.$router;
        if (router) {
          router.push('/download-center/tasks');
        } else {
          window.location.href = '/download-center/tasks';
        }
      }
    },
    
    /**
     * 登出
     * 清除认证信息并跳转到登录页面
     */
    logout() {
      console.log('用户登出');
      
      this.clearAuth();
      this.clearRedirectPath();
      
      // 跳转到登录页面
      setTimeout(() => {
        window.location.href = LOGIN_URL;
      }, 100);
    },
    
    /**
     * 强制重新认证
     * 当检测到认证问题时调用
     */
    forceReauth(targetPath = null) {
      console.log('强制重新认证');
      
      if (targetPath) {
        this.setRedirectPath(targetPath);
      }
      
      this.clearAuth();
      
      // 跳转到登录页面
      setTimeout(() => {
        window.location.href = LOGIN_URL;
      }, 100);
    }
  }
});
