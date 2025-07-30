import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus, { ElMessage } from 'element-plus'
import { faker } from '@faker-js/faker'

import DownloadedVideos from '../DownloadedVideos.vue'
import { useDownloadStore } from '@/store/download'
import * as downloadApi from '@/api/download'

// --- Mocks ---
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/api/download')

vi.mock('element-plus', async () => ({
    ...(await vi.importActual('element-plus')),
    ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

// --- Helpers ---
let wrapper
let store

const createMockTask = (overrides = {}) => ({
  id: faker.string.uuid(),
  video_id: faker.string.alphanumeric(15),
  liveroom_id: faker.string.numeric(10),
  liveroom_title: faker.lorem.sentence(),
  resource_type: 'hls',
  status: 'completed',
  progress: 1,
  ...overrides,
})

const mountComponent = () => {
  wrapper = mount(DownloadedVideos, {
    global: {
      plugins: [ElementPlus],
    },
  })
}

// --- Test Suite ---
describe('DownloadedVideos.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDownloadStore()
    store.retryDownloadTask = vi.fn()
    vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: [], total: 0 })
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('应在挂载时默认获取“已完成”状态的任务', async () => {
    mountComponent()
    await flushPromises()
    expect(downloadApi.fetchDownloadTasks).toHaveBeenCalledOnce()
    expect(downloadApi.fetchDownloadTasks).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    )
  })

  it('应能正确渲染任务列表', async () => {
    const tasks = [createMockTask({ liveroom_title: 'My Video Title' })]
    vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: tasks, total: 1 })
    mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('My Video Title')
  })

  it('应在activeTabName变化后获取相应状态的任务', async () => {
    mountComponent()
    await flushPromises() // Initial fetch

    // 直接修改 ref 来触发 watch
    wrapper.vm.activeTabName = 'partial_completed';
    await flushPromises()

    expect(downloadApi.fetchDownloadTasks).toHaveBeenCalledTimes(2)
    expect(downloadApi.fetchDownloadTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'partial_completed' })
    )
  })

  it('点击任务行应导航到详情页', async () => {
    const tasks = [createMockTask({ id: 'task-abc' })]
    vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: tasks, total: 1 })
    mountComponent()
    await flushPromises()

    await wrapper.find('tbody tr').trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith('/download-center/tasks/task-abc')
  })

  describe('健壮性与边缘情况', () => {
    it('当API调用失败时，应显示错误状态', async () => {
        vi.mocked(downloadApi.fetchDownloadTasks).mockRejectedValue(new Error('API Error'))
        mountComponent()
        await flushPromises()
        const emptyTextEl = wrapper.find('.el-table__empty-text')
        expect(emptyTextEl.text()).toBe('加载失败，请刷新重试')
        // 关键修复：直接使用导入的 ElMessage
        expect(ElMessage.error).toHaveBeenCalledWith('数据格式错误或请求失败')
    })

    it('当API返回空列表时，应显示空状态', async () => {
        vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: [], total: 0 })
        mountComponent()
        await flushPromises()
        const emptyTextEl = wrapper.find('.el-table__empty-text')
        expect(emptyTextEl.text()).toBe('暂无相关任务')
    })
  })

  describe('针对“部分完成”任务的操作', () => {
    let tasks
    beforeEach(async () => {
      tasks = [createMockTask({ id: 'task-partial', status: 'partial_completed' })]
      vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: tasks, total: 1 })
      
      mountComponent()
      
      wrapper.vm.activeTabName = 'partial_completed';
      await flushPromises()
    })

    it('应显示“失败记录”和“重试”按钮', () => {
      const buttons = wrapper.findAll('button.el-button--small')
      expect(buttons.some(b => b.text().includes('失败记录'))).toBe(true)
      expect(buttons.some(b => b.text().includes('重试'))).toBe(true)
    })

    it('点击“失败记录”应导航到失败记录页', async () => {
      const failuresButton = wrapper.findAll('button.el-button--small').find(b => b.text() === '失败记录')
      await failuresButton.trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith('/download-center/tasks/task-partial/failures')
    })
    
    it('点击“重试”应调用 store action 并刷新列表', async () => {
      store.retryDownloadTask.mockResolvedValue({})
      const retryButton = wrapper.find('button.el-button--warning')
      await retryButton.trigger('click')

      expect(store.retryDownloadTask).toHaveBeenCalledWith('task-partial')
      await flushPromises()
      expect(downloadApi.fetchDownloadTasks).toHaveBeenCalledTimes(3) // Mount, Tab change, Retry
    })
  })
  
  it('应能正确处理分页', async () => {
    const tasks = Array.from({ length: 15 }, () => createMockTask())
    vi.mocked(downloadApi.fetchDownloadTasks).mockResolvedValue({ items: tasks.slice(0, 10), total: 15 })
    mountComponent()
    await flushPromises()

    expect(wrapper.find('.total-pages').text()).toContain('/ 2')

    const nextPageBtn = wrapper.find('.page-btn:not(:disabled)[aria-label="下一页"]')
    await nextPageBtn.trigger('click')
    await flushPromises()

    expect(downloadApi.fetchDownloadTasks).toHaveBeenCalledTimes(2)
    expect(downloadApi.fetchDownloadTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, size: 10 })
    )
  })
})