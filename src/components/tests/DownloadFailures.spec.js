import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import { faker } from '@faker-js/faker'

import DownloadFailures from '../DownloadFailures.vue'
import * as downloadApi from '@/api/download'

// --- Mocks ---
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { taskId: 'task-abc' },
  }),
}))

vi.mock('@/api/download')

vi.mock('element-plus', async () => ({
    ...(await vi.importActual('element-plus')),
    ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

// --- Helpers ---
let wrapper

const createMockFailure = (overrides = {}) => ({
  id: faker.string.uuid(),
  resource_url: faker.internet.url(),
  expected_path: faker.system.filePath(),
  resource_type: 'ts',
  failure_type: 'download_failed',
  error_message: faker.lorem.sentence(),
  retry_count: faker.number.int({ min: 0, max: 5 }),
  next_retry_time: new Date().toISOString(),
  status: 'pending',
  ...overrides,
})

const mountComponent = () => {
  wrapper = mount(DownloadFailures, {
    global: {
      plugins: [ElementPlus],
    },
  })
}

// --- Test Suite ---
describe('DownloadFailures.vue', () => {
  beforeEach(() => {
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: [] } } })
    vi.mocked(downloadApi.retryDownloadTask).mockResolvedValue({ data: { code: 200 } })
    vi.mocked(downloadApi.abandonFailure).mockResolvedValue({ data: { code: 200 } })
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('应在挂载时使用路由参数获取失败记录', async () => {
    mountComponent()
    await flushPromises()
    expect(downloadApi.getTaskFailures).toHaveBeenCalledOnce()
    expect(downloadApi.getTaskFailures).toHaveBeenCalledWith('task-abc', expect.anything())
  })

  it('应能正确渲染失败记录列表', async () => {
    const failures = [createMockFailure({ error_message: 'Connection Timeout' })]
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: failures } } })
    mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('Connection Timeout')
  })

  it('当没有失败记录时应显示空状态', async () => {
    mountComponent()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ElEmpty' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无失败记录')
  })

  it('点击“重试全部”按钮应调用相应的API', async () => {
    const failures = [createMockFailure()]
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: failures } } })
    mountComponent()
    await flushPromises()

    await wrapper.find('button.el-button--primary').trigger('click')
    await flushPromises()
    
    expect(downloadApi.retryDownloadTask).toHaveBeenCalledWith('task-abc')
    expect(ElMessage.success).toHaveBeenCalledWith('重试全部失败片段成功')
    expect(downloadApi.getTaskFailures).toHaveBeenCalledTimes(2) // 1 on mount, 1 after retry
  })

  it('当“重试全部”API调用失败时，应显示错误消息', async () => {
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: [createMockFailure()] } } })
    vi.mocked(downloadApi.retryDownloadTask).mockResolvedValue({ data: { code: 500, message: '服务端错误' } })
    mountComponent()
    await flushPromises()

    await wrapper.find('button.el-button--primary').trigger('click')
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('服务端错误')
  })

  it('点击“放弃”按钮应调用相应的API', async () => {
    const failureId = 'failure-123'
    const failures = [createMockFailure({ id: failureId })]
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: failures } } })
    mountComponent()
    await flushPromises()

    await wrapper.find('button.el-button--danger').trigger('click')
    await flushPromises()

    expect(downloadApi.abandonFailure).toHaveBeenCalledWith('task-abc', failureId)
    expect(ElMessage.success).toHaveBeenCalledWith('放弃失败记录成功')
    expect(downloadApi.getTaskFailures).toHaveBeenCalledTimes(2) // 1 on mount, 1 after abandon
  })

  it('当“放弃”API调用失败时，应显示错误消息', async () => {
    const failureId = 'failure-123'
    vi.mocked(downloadApi.getTaskFailures).mockResolvedValue({ data: { data: { items: [createMockFailure({ id: failureId })] } } })
    vi.mocked(downloadApi.abandonFailure).mockResolvedValue({ data: { code: 500, message: '放弃操作失败' } })
    mountComponent()
    await flushPromises()

    await wrapper.find('button.el-button--danger').trigger('click')
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('放弃操作失败')
  })

  it('当API调用失败时应显示错误消息', async () => {
    vi.mocked(downloadApi.getTaskFailures).mockRejectedValue({ message: 'Network Error' })
    mountComponent()
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('Network Error')
  })
}) 