import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true, // 允许在测试文件中直接使用 describe, it, expect 等，无需导入
    environment: 'jsdom', // 切换到 JSDOM 以获得更好的兼容性
    alias: {
      // 必须配置路径别名，否则测试代码中无法识别 @/
      '@': resolve(__dirname, './src')
    },
  },
})
