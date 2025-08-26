/**
 * 时间处理工具函数
 * 基于Day.js实现时间戳的格式化和时区处理
 */
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/zh-cn';

// 配置Day.js插件和语言
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');

/**
 * 格式化ISO 8601时间戳为本地时间
 * @param {string} isoString - ISO 8601格式的时间戳
 * @param {string} format - 时间格式，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} - 格式化后的本地时间
 */
export function formatDateTime(isoString, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!isoString) return '-';
  
  try {
    return dayjs(isoString).format(format);
  } catch (error) {
    console.error('时间格式化失败:', error);
    return '-';
  }
}

/**
 * 格式化为相对时间（如：刚刚、5分钟前、今天 14:30）
 * @param {string} isoString - ISO 8601格式的时间戳
 * @returns {string} - 相对时间描述
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '-';
  
  try {
    const date = dayjs(isoString);
    const now = dayjs();
    const diffInMinutes = now.diff(date, 'minute');
    const diffInHours = now.diff(date, 'hour');
    const diffInDays = now.diff(date, 'day');
    
    // 1分钟内
    if (diffInMinutes < 1) {
      return '刚刚';
    }
    // 1小时内
    else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    }
    // 今天内
    else if (diffInHours < 24 && date.isSame(now, 'day')) {
      return `今天 ${date.format('HH:mm')}`;
    }
    // 昨天
    else if (diffInDays === 1) {
      return `昨天 ${date.format('HH:mm')}`;
    }
    // 7天内
    else if (diffInDays < 7) {
      return `${diffInDays}天前`;
    }
    // 超过7天
    else {
      return date.format('YYYY-MM-DD HH:mm');
    }
  } catch (error) {
    console.error('相对时间格式化失败:', error);
    return '-';
  }
}

/**
 * 格式化为简短时间格式
 * @param {string} isoString - ISO 8601格式的时间戳
 * @returns {string} - 简短时间格式
 */
export function formatShortDateTime(isoString) {
  if (!isoString) return '-';
  
  try {
    const date = dayjs(isoString);
    const now = dayjs();
    
    // 今天
    if (date.isSame(now, 'day')) {
      return date.format('HH:mm');
    }
    // 今年
    else if (date.isSame(now, 'year')) {
      return date.format('MM-DD HH:mm');
    }
    // 不同年
    else {
      return date.format('YYYY-MM-DD');
    }
  } catch (error) {
    console.error('简短时间格式化失败:', error);
    return '-';
  }
}

/**
 * 格式化时长（秒）为时分秒格式
 * @param {number} seconds - 时长（秒）
 * @returns {string} - 格式化后的时长（如：01:23:45）
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} - 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * 检查时间是否在指定范围内
 * @param {string} isoString - ISO 8601格式的时间戳
 * @param {number} minutesAgo - 多少分钟前
 * @returns {boolean} - 是否在指定时间范围内
 */
export function isWithinMinutes(isoString, minutesAgo) {
  if (!isoString) return false;
  
  try {
    const date = dayjs(isoString);
    const threshold = dayjs().subtract(minutesAgo, 'minute');
    return date.isAfter(threshold);
  } catch (error) {
    console.error('时间范围检查失败:', error);
    return false;
  }
}

/**
 * 获取当前时间的ISO字符串
 * @returns {string} - ISO 8601格式的当前时间
 */
export function getCurrentISOString() {
  return dayjs().toISOString();
}