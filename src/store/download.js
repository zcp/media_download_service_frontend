import { defineStore } from 'pinia'
import * as api from '@/api/download'
import { ElMessage } from 'element-plus'

export const useDownloadStore = defineStore('download', {
  state: () => ({
    tasks: [],
    taskDetail: null,
    failures: [],
    loading: false,
    error: null,
    downloadedVideos: [],
    total: 0 // Added for pagination
  }),
  actions: {
    async fetchTasks({ page = 1, pageSize = 6 } = {}) {
      this.loading = true
      try {
        // 这里必须传 page 和 size，不能传 skip 和 limit！
        const res = await api.getDownloadTasks({ page, size: pageSize })
        this.tasks = res.data.data.items
        this.total = res.data.data.total
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '获取任务列表失败')
      } finally {
        this.loading = false
      }
    },
    async fetchTaskDetail(taskId) {
      this.loading = true
      try {
        const res = await api.getDownloadTaskDetail(taskId)
        this.taskDetail = res.data.data
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '获取任务详情失败')
      } finally {
        this.loading = false
      }
    },
    async fetchFailures(taskId, params) {
      this.loading = true
      try {
        const res = await api.getTaskFailures(taskId, params)
        this.failures = res.data.data.items
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '获取失败记录失败')
      } finally {
        this.loading = false
      }
    },
    async fetchAllFailures(params) {
      this.loading = true
      try {
        const res = await api.getAllFailures(params)
        this.failures = res.data.data.items
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '获取全部失败记录失败')
      } finally {
        this.loading = false
      }
    },
    /**
     * 创建下载任务
     * @param {Object|Array} data 单条任务对象 或 任务对象数组
     * @param {Boolean} showMsg 是否弹窗提示（单条时默认true，批量时默认false）
     */
    async createTask(data, showMsg = true) {
      this.loading = true
      try {
        // 批量导入
        if (Array.isArray(data)) {
          let successCount = 0
          let failCount = 0
          for (const task of data) {
            try {
              await api.createDownloadTask(task)
              successCount++
            } catch {
              failCount++
            }
          }
          if (showMsg) {
            ElMessage.success(`批量导入完成，成功${successCount}条，失败${failCount}条`)
          }
        } else {
          // 单条创建
          await api.createDownloadTask(data)
          if (showMsg) ElMessage.success('创建任务成功')
        }
      } catch (e) {
        this.error = e
        if (showMsg) ElMessage.error(e?.message || '创建任务失败')
        throw e
      } finally {
        this.loading = false
      }
    },
    async retryFailure(taskId, failureId) {
      this.loading = true
      try {
        await api.retryFailure(taskId, failureId)
        ElMessage.success('重试失败记录成功')
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '重试失败')
      } finally {
        this.loading = false
      }
    },
    async abandonFailure(taskId, failureId) {
      this.loading = true
      try {
        await api.abandonFailure(taskId, failureId)
        ElMessage.success('放弃失败记录成功')
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '放弃失败')
      } finally {
        this.loading = false
      }
    },
    async retryDownloadTask(taskId) {
      this.loading = true
      try {
        await api.retryDownloadTask(taskId)
        ElMessage.success('重试下载任务成功')
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '重试下载任务失败')
      } finally {
        this.loading = false
      }
    },
    async startDownloadTask(taskId) {
      this.loading = true
      try {
        await api.startDownloadTask(taskId)
        ElMessage.success('开始下载任务成功')
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '开始下载任务失败')
      } finally {
        this.loading = false
      }
    },
    async deleteDownloadTask(taskId) {
      this.loading = true
      try {
        await api.deleteDownloadTask(taskId)
        ElMessage.success('删除任务成功')
      } catch (e) {
        this.error = e
        ElMessage.error(e?.message || '删除任务失败')
      } finally {
        this.loading = false
      }
    },
    async fetchDownloadedVideosByTask(taskId, params) {
      this.loading = true
      try {
        const res = await api.getDownloadedVideosByTask(taskId, params)
        this.downloadedVideos = res.data.data.items
      } catch (e) {
        this.error = e
          ElMessage.error(e?.message || '获取已下载视频失败')
      } finally {
        this.loading = false
      }
    },
    async retry(failureId) {
      if (!this.taskId || this.taskId === 'undefined') return
      this.loading = true
      try {
        const res = await this.retryFailure(this.taskId, failureId)
        if (res && res.data.code === 200) {
          ElMessage.success('重试下载成功')
        } else {
          ElMessage.error(res?.data?.message || '重试下载失败')
        }
        await this.fetchFailures(this.taskId)
      } finally {
        this.loading = false
      }
    },
    async retryAll() {
      if (!this.taskId || this.taskId === 'undefined') return
      this.loading = true
      try {
        const res = await this.retryDownloadTask(this.taskId)
        if (res && res.data.code === 200) {
          ElMessage.success('重试全部失败片段成功')
        } else {
          ElMessage.error(res?.data?.message || '重试全部失败片段失败')
        }
        await this.fetchFailures(this.taskId)
      } finally {
        this.loading = false
      }
    }
  }
})
