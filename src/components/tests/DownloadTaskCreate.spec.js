import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus, { ElMessage } from 'element-plus'

import DownloadTaskCreate from '../DownloadTaskCreate.vue'
import { useDownloadStore } from '@/store/download'
import * as securityUtils from '@/utils/security'

// Mocks
import { ElMessage } from 'element-plus'

// --- Mocks Setup ---
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('element-plus', async () => ({
  ...(await vi.importActual('element-plus')),
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/utils/security', async () => ({
  ...(await vi.importActual('@/utils/security')),
  validateUrl: vi.fn(),
  generateVideoId: vi.fn(liveroomId => `mock_video_id_for_${liveroomId}`),
  sanitizeForCsv: vi.fn(text => `'${text}`),
}))

// Add mock for the missing dependency
vi.mock('@/utils/validate', () => ({
  isValidVideoId: vi.fn(() => true),
}))

// --- Test Suite ---
describe('DownloadTaskCreate.vue - 创建下载任务', () => {
  let wrapper
  let store

  const mountComponent = () => {
    wrapper = mount(DownloadTaskCreate, {
      global: {
        plugins: [ElementPlus],
      },
    })
  }

  // Global setup for mocks and store, but NOT for mounting.
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDownloadStore()
    store.createTask = vi.fn()
    vi.clearAllMocks()
    vi.mocked(securityUtils.validateUrl).mockReturnValue({ isValid: true })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // --- Test Cases ---

  describe('初始渲染', () => {
    it('应能正确渲染表单布局', async () => {
      mountComponent()
      await flushPromises()
      const header = wrapper.find('[data-testid="card-header-title"]')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('创建下载任务')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.findAll('.el-form-item').length).toBe(7)
      const createBtn = wrapper.findAll('button').find(btn => btn.text().includes('立即创建'))
      expect(createBtn).toBeTruthy()
      expect(createBtn.text()).toBe('立即创建')
    })

    it('应将 video_id 输入框渲染为只读', async () => {
      mountComponent()
      await flushPromises()
      const videoIdInput = wrapper.find('input[placeholder="由直播间ID自动生成"]')
      expect(videoIdInput.attributes('readonly')).toBeDefined()
    })
  })

  describe('表单交互与自动填充', () => {
    beforeEach(() => {
      mountComponent()
    })

    it('输入 .m3u8 链接时应自动选择 HLS 类型', async () => {
      await flushPromises()
      const urlInput = wrapper.find('input[placeholder="粘贴链接后将自动识别类型"]')
      await urlInput.setValue('http://example.com/video.m3u8')
      expect(wrapper.vm.form.resource_type).toBe('hls')
    })

    it('输入有效的直播间ID时应自动生成视频ID', async () => {
      await flushPromises()
      const liveroomIdInput = wrapper.find('input[placeholder="输入后将自动生成视频ID"]')
      await liveroomIdInput.setValue('12345678')
      const paddedId = '0012345678'
      expect(securityUtils.generateVideoId).toHaveBeenCalledWith(paddedId)
      expect(wrapper.vm.form.video_id).toBe(`mock_video_id_for_${paddedId}`)
    })

    it('当直播间ID变为无效时应清除视频ID', async () => {
      await flushPromises()
      const liveroomIdInput = wrapper.find('input[placeholder="输入后将自动生成视频ID"]')
      await liveroomIdInput.setValue('12345678') // valid
      await liveroomIdInput.setValue('123') // invalid
      expect(wrapper.vm.form.video_id).toBe('')
    })
  })


  describe('表单提交', async () => {
    beforeEach(async () => {
      mountComponent()
      await flushPromises() // Wait for component to render before filling form
    })

    it('成功创建后应显示成功消息并导航', async () => {
      store.createTask.mockResolvedValue({})
      await wrapper.vm.onSubmit()
      expect(ElMessage.success).toHaveBeenCalledWith('任务创建成功！')
      expect(mockRouterPush).toHaveBeenCalledWith('/download-center/tasks')
    })

    it('当 store action 失败时应显示错误消息', async () => {
      const apiError = new Error('Network Error')
      store.createTask.mockRejectedValue(apiError)
      await wrapper.vm.onSubmit()
      expect(ElMessage.error).toHaveBeenCalledWith(apiError.message)
    })

    it('应能处理取消按钮的点击', async () => {
      await flushPromises()
      await wrapper.find('button.el-button').trigger('click') // First button is cancel
      expect(mockRouterPush).toHaveBeenCalledWith('/download-center/tasks')
    })
  })
})

async function waitForInput(wrapper, selector, timeout = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await flushPromises()
    const input = wrapper.find(selector)
    if (input.exists()) return input
  }
  throw new Error('input not found: ' + selector)
}

function findInputByPlaceholder(wrapper, keyword) {
  return wrapper.findAll('input').find(i => (i.attributes('placeholder') || '').includes(keyword))
}
