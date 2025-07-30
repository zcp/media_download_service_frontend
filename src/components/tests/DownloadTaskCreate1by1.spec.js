import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus, { ElMessage } from 'element-plus'
import { nextTick } from 'vue'

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
      await nextTick()
      expect(wrapper.find('[data-testid="card-header-title"]').text()).toBe('创建下载任务')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.findAll('.el-form-item').length).toBe(7)
      expect(wrapper.find('button[type="primary"]').text()).toBe('立即创建')
    })

    it('应将 video_id 输入框渲染为只读', async () => {
      mountComponent()
      await nextTick()
      const videoIdInput = wrapper.find('input[placeholder="由直播间ID自动生成"]')
      expect(videoIdInput.attributes('readonly')).toBeDefined()
    })
  })

  describe('表单交互与自动填充', () => {
    beforeEach(() => {
      mountComponent()
    })

    it('输入 .m3u8 链接时应自动选择 HLS 类型', async () => {
      const urlInput = wrapper.find('input[placeholder="粘贴链接后将自动识别类型"]')
      await urlInput.setValue('http://example.com/video.m3u8')
      expect(wrapper.vm.form.resource_type).toBe('hls')
    })

    it('输入有效的直播间ID时应自动生成视频ID', async () => {
      const liveroomIdInput = wrapper.find('input[placeholder="输入后将自动生成视频ID"]')
      await liveroomIdInput.setValue('12345678')
      const paddedId = '0012345678'
      expect(securityUtils.generateVideoId).toHaveBeenCalledWith(paddedId)
      expect(wrapper.vm.form.video_id).toBe(`mock_video_id_for_${paddedId}`)
    })

    it('当直播间ID变为无效时应清除视频ID', async () => {
      const liveroomIdInput = wrapper.find('input[placeholder="输入后将自动生成视频ID"]')
      await liveroomIdInput.setValue('12345678') // valid
      await liveroomIdInput.setValue('123') // invalid
      expect(wrapper.vm.form.video_id).toBe('')
    })
  })
})
