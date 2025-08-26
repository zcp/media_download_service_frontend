/**
 * JWT Token 工具函数
 * 提供JWT Token处理的纯函数工具
 */

/**
 * 检查JWT Token是否过期
 * @param {string} token - JWT Token
 * @returns {boolean} - true表示过期，false表示未过期
 */
export function isTokenExpired(token) {
  if (!token) {
    console.log('Token验证: Token为空');
    return true;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp <= currentTime;
    
    console.log('Token验证:', {
      token: token.substring(0, 20) + '...',
      exp: payload.exp,
      currentTime,
      isExpired,
      timeLeft: payload.exp - currentTime
    });
    
    return isExpired;
  } catch (error) {
    console.error('Token解析失败:', error);
    return true;
  }
}

/**
 * 从JWT Token中解析用户信息
 * @param {string} token - JWT Token
 * @returns {object|null} - 用户信息对象或null
 */
export function parseUserFromToken(token) {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      user_id: payload.user_id || payload.sub,
      username: payload.username,
      email: payload.email
    };
  } catch (error) {
    console.error('Token用户信息解析失败:', error);
    return null;
  }
}

/**
 * 获取Token过期时间（毫秒时间戳）
 * @param {string} token - JWT Token
 * @returns {number|null} - 过期时间戳或null
 */
export function getTokenExpiry(token) {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // 转换为毫秒
  } catch (error) {
    console.error('Token过期时间解析失败:', error);
    return null;
  }
}

/**
 * 检查Token有效性（存在且未过期）
 * @param {string} token - JWT Token
 * @returns {boolean} - true表示有效，false表示无效
 */
export function isTokenValid(token) {
  return token && !isTokenExpired(token);
}

/**
 * 从localStorage获取Token
 * @returns {string|null} - Token或null
 */
export function getStoredToken() {
  try {
    return localStorage.getItem('jwt_token');
  } catch (error) {
    console.error('获取存储的Token失败:', error);
    return null;
  }
}

/**
 * 向localStorage存储Token
 * @param {string} token - JWT Token
 */
export function setStoredToken(token) {
  try {
    localStorage.setItem('jwt_token', token);
  } catch (error) {
    console.error('存储Token失败:', error);
  }
}

/**
 * 从localStorage移除Token
 */
export function removeStoredToken() {
  try {
    localStorage.removeItem('jwt_token');
  } catch (error) {
    console.error('移除Token失败:', error);
  }
}
