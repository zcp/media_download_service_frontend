import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import ElementPlus, { ElMessage, ElMessageBox } from 'element-plus'
import { faker } from '@faker-js/faker'

import DownloadTaskDetail from '../DownloadTaskDetail.vue'
import { useDownloadStore } from '@/store/download'

// --- Mocks ---
const mockRouterPush = vi.fn()
const mockRouterBack = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
  }),
  useRoute: () => ({
    params: { taskId: 'task-123' },
    query: { fromPage: '2' },
  }),
}))

vi.mock('element-plus', async () => ({
    ...(await vi.importActual('element-plus')),
    ElMessage: { 
      success: vi.fn(), 
      error: vi.fn(), 
      warning: vi.fn(),
      info: vi.fn() // 加上这一行
    },
    ElMessageBox: { confirm: vi.fn() }
}))


// --- Helpers ---
let wrapper
let store

const createMockTask = (overrides = {}) => ({
  id: 'task-123',
  video_id: faker.string.alphanumeric(15),
  liveroom_id: faker.string.numeric(10),
  resource_type: 'hls',
  status: 'pending',
  progress: 0,
  retry_count: 0,
  last_error: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
  ...overrides,
})

const mountComponent = () => {
  wrapper = mount(DownloadTaskDetail, {
    global: {
      plugins: [ElementPlus],
    },
  })
}

// --- Test Suite ---
describe('DownloadTaskDetail.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDownloadStore()
    
    // Mock store actions
    store.fetchTaskDetail = vi.fn()
    store.retryDownloadTask = vi.fn()
    store.deleteDownloadTask = vi.fn()

    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('应在挂载时使用路由参数调用 fetchTaskDetail', async () => {
    mountComponent()
    expect(store.fetchTaskDetail).toHaveBeenCalledOnce()
    expect(store.fetchTaskDetail).toHaveBeenCalledWith('task-123')
  })

  it('应正确渲染从 store 获取的任务详情', async () => {
    const task = createMockTask({ video_id: 'vid-001', liveroom_id: 'room-002' })
    const { taskDetail } = storeToRefs(store)
    taskDetail.value = task
    
    mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('vid-001')
    expect(wrapper.text()).toContain('room-002')
    expect(wrapper.find('.el-tag').text()).toBe('待处理')
  })

  describe('状态依赖的UI', () => {
    it('当任务状态为 failed 时，应显示“重试”按钮', async () => {
      const { taskDetail } = storeToRefs(store)
      taskDetail.value = createMockTask({ status: 'failed' })
      mountComponent()
      await flushPromises()
      const retryBtn = wrapper.findAll('button').find(btn => btn.text().includes('重试'))
      expect(retryBtn).toBeTruthy()
    })

    it('当任务状态为 completed 时，不应显示任何操作按钮', async () => {
        const { taskDetail } = storeToRefs(store)
        taskDetail.value = createMockTask({ status: 'completed' })
        mountComponent()
        await flushPromises()
        const buttons = wrapper.findAll('button.el-button').filter(b => b.isVisible())
        // Only the back button in header should exist, but it's not a .el-button
        expect(buttons.length).toBe(0)
    })
  })

  describe('用户交互', () => {
    beforeEach(() => {
        const { taskDetail } = storeToRefs(store)
        taskDetail.value = createMockTask({ status: 'failed' })
        mountComponent()
    })

    it('点击“返回”按钮应能正确导航', async () => {
      await wrapper.find('.el-page-header__header').find('div[role="button"]').trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/download-center/tasks', query: { page: '2' } })
    })


    it('点击“取消”按钮并确认后，应调用 store action 并导航', async () => {
        vi.mocked(ElMessageBox.confirm).mockResolvedValue(true) // 模拟用户点击确认
        const { taskDetail } = storeToRefs(store)
        taskDetail.value = createMockTask({ status: 'pending' })
        await flushPromises()
        
        store.deleteDownloadTask.mockResolvedValue({})
        await wrapper.find('button.el-button--danger').trigger('click')

        expect(ElMessageBox.confirm).toHaveBeenCalled()
        await flushPromises()
        expect(store.deleteDownloadTask).toHaveBeenCalledWith('task-123')
        expect(ElMessage.success).toHaveBeenCalledWith('任务已取消')
        expect(mockRouterPush).toHaveBeenCalledWith('/download-center/tasks')
    })

    it('点击“取消”按钮但选择放弃后，不应调用 store action', async () => {
        vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel') // 模拟用户点击取消
        const { taskDetail } = storeToRefs(store)
        taskDetail.value = createMockTask({ status: 'pending' })
        await flushPromises()

        await wrapper.find('button.el-button--danger').trigger('click')

        expect(ElMessageBox.confirm).toHaveBeenCalled()
        await flushPromises()
        expect(store.deleteDownloadTask).not.toHaveBeenCalled()
        expect(ElMessage.info).toHaveBeenCalledWith('操作已取消')
    })
  })

  describe('健壮性与边缘情况', () => {
    it('当API获取详情失败时，组件不应崩溃', async () => {
        store.fetchTaskDetail.mockRejectedValue(new Error('API Error'))
        mountComponent()
        await flushPromises()
        // We just expect the component to not crash and show an empty-ish state
        expect(wrapper.find('.header-id').text()).toBe('ID:') // ID should be empty
        expect(wrapper.find('.el-descriptions').exists()).toBe(true) // Descriptions table still renders
    })
  })
})
