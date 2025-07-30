/**
 * 对CSV单元格数据进行清理，防止公式注入攻击。
 * 在以'=', '+', '-', '@'开头的字符串前添加单引号。
 * @param {string | undefined | null} text - 要清理的文本.
 * @returns {string | undefined | null} - 清理后的文本.
 */
export function sanitizeForCsv(text) {
  if (typeof text !== 'string' || !text) {
    return text;
  }
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.includes(text.charAt(0))) {
    // Prepend a single quote to treat it as a literal string in spreadsheet software
    return "'" + text;
  }
  return text;
}

/**
 * 验证给定的URL是否有效和安全。
 * @param {string} urlString - 要验证的URL字符串.
 * @returns {{isValid: boolean, reason: string}} - 验证结果.
 */
export function validateUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, reason: 'URL不能为空' };
  }

  try {
    const url = new URL(urlString);

    // 1. 协议检查
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { isValid: false, reason: `不支持的协议: ${url.protocol}` };
    }

    // 2. SSRF 防护：检查 hostname
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
        return { isValid: false, reason: '禁止使用本地地址' };
    }
    // 检查私有IP地址范围
    const ipRegex = /^(10(\.\d{1,3}){3})|(172\.(1[6-9]|2\d|3[0-1])(\.\d{1,3}){2})|(192\.168(\.\d{1,3}){2})$/;
    if (ipRegex.test(hostname)) {
        return { isValid: false, reason: '禁止使用私有网络地址' };
    }

    // 3. 检查是否为有效的m3u8或mp4资源
    // 检查路径名是否以.m3u8或.mp4结尾，可以带查询参数
    const pathname = url.pathname.toLowerCase();
    if (!pathname.endsWith('.m3u8') && !pathname.endsWith('.mp4')) {
      return { isValid: false, reason: 'URL必须指向一个 .m3u8 或 .mp4 文件' };
    }
    
    // 可选：未来可以增加域名白名单检查
    // const allowedDomains = ['example.com', 'stream.example.org'];
    // if (!allowedDomains.includes(url.hostname)) {
    //   return { isValid: false, reason: `不允许的域名: ${url.hostname}` };
    // }

    return { isValid: true, reason: '' };

  } catch (error) {
    return { isValid: false, reason: 'URL格式无效' };
  }
}

/**
 * 使用密码学安全的方法生成唯一的 video_id。
 * @param {string} liveroom_id - 经过补全的10位直播间ID.
 * @returns {string} - 生成的 video_id.
 */
export function generateVideoId(liveroom_id) {
  // 1. 使用 window.crypto 获取一个密码学安全的随机值
  // Uint32Array(1) 创建一个包含一个32位无符号整数的数组
  const randomValues = new Uint32Array(1);
  
  // 浏览器和Node.js环境兼容性检查
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
  } else {
    // Fallback for non-browser environments (like older Node.js versions in testing)
    // 这不是密码学安全的，但能确保在测试等非浏览器环境下代码不会崩溃
    randomValues[0] = Math.floor(Math.random() * Math.pow(2, 32));
  }

  // 2. 将这个随机数转换为0到9999之间的数
  //    randomValues[0] 是一个很大的随机整数
  //    % 9000 会得到 0-8999 之间的数
  //    + 1000 会得到 1000-9999 之间的数
  const secureRandom = (randomValues[0] % 9000) + 1000;

  // 3. 拼接成最终的 ID
  return `${liveroom_id}_${secureRandom}`;
} 