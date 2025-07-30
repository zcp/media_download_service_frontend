// 校验URL格式
export function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// src/utils/validate.js
export const isValidLiveroomId = (id) => /^\d{9,}$/.test(id)

export const isValidVideoId = (id) => /^\d{9,10}_.+$/.test(id)
