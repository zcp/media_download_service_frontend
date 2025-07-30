import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { faker } from '@faker-js/faker'
import { nextTick } from 'vue'
import Papa from 'papaparse'

// --- Mocks Setup ---
// 必须在导入模块前设置所有的 mock

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} })
}))

// Mock element-plus
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    ElMessageBox: { confirm: vi.fn() }
  }
})

// Mock API 模块
vi.mock('@/api/download')

// Mock papaparse library
vi.mock('papaparse')

// 现在导入依赖模块
import ElementPlus from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDownloadStore } from '@/store/download'
import * as downloadApi from '@/api/download'

// 目标组件
import DownloadTaskList from '../DownloadTaskList.vue'

// --- 辅助函数 ---

// 添加 createMockTask 辅助函数
const createMockTask = (overrides = {}) => ({
  id: faker.string.uuid(),
  video_id: faker.string.alphanumeric(10),
  liveroom_id: faker.string.numeric(10),
  liveroom_title: faker.lorem.sentence(),
  resource_type: faker.helpers.arrayElement(['hls', 'mp4']),
  status: 'pending',
  progress: 0,
  retry_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// --- Test Suite ---

describe('DownloadTaskList.vue (1by1)', () => {
  let wrapper
  let store

  // 挂载组件的辅助函数
  const mountComponent = () => {
    wrapper = mount(DownloadTaskList, {
      global: {
        plugins: [ElementPlus], // 注册 Element Plus 插件
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDownloadStore()
    // Mock store actions
    store.startDownloadTask = vi.fn()
    store.retryDownloadTask = vi.fn()
    store.deleteDownloadTask = vi.fn()
    store.createTask = vi.fn()
    vi.clearAllMocks()
    // 默认 API 响应
    vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: [], total: 0 })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })
  // 新增: 删除操作测试
  describe('删除任务操作', () => {
    const taskToDelete = createMockTask({ id: 'task-to-delete', liveroom_id: 'room-delete', status: 'pending' })
    
    beforeEach(async () => {
      vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ 
        items: [taskToDelete], 
        total: 1 
      })
      
      mountComponent()
      await flushPromises()
      
      // 打印组件HTML结构，帮助调试
      console.log('删除测试组件HTML结构:', wrapper.html());
    })
    
    it('应在删除操作失败时显示错误消息', async () => {
      // 模拟用户确认删除但操作失败
      vi.mocked(ElMessageBox.confirm).mockResolvedValueOnce()
      store.deleteDownloadTask.mockRejectedValue(new Error('删除失败'))
      
      // 点击删除按钮
      await wrapper.find('[data-testid="delete-btn-task-to-delete"]').trigger('click')
      await flushPromises()
      
      // 验证错误消息被显示
      expect(ElMessage.error).toHaveBeenCalledWith('删除失败，请稍后重试')
    })
  })
})
