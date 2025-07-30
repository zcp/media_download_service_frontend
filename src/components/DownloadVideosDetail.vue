<template>
  <el-card shadow="never" class="detail-card">
    <template #header>
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <span class="header-title">任务已下载视频</span>
            <span class="header-id">任务ID: {{ route.params.taskId }}</span>
          </div>
        </template>
      </el-page-header>
    </template>

    <!-- 已下载视频详细信息 -->
    <div v-if="loading" class="loading-container">
      <el-loading></el-loading>
      <p>加载中...</p>
    </div>
    
    <div v-else style="margin-top: 0;">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="视频记录ID" :span="2">
          <span class="id-text">{{ videoDetail?.id || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="视频ID" :span="2">
          <span class="id-text">{{ videoDetail?.video_id || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="直播间ID">{{ videoDetail?.liveroom_id || '无' }}</el-descriptions-item>
        <el-descriptions-item label="直播间标题">{{ videoDetail?.liveroom_title || '无' }}</el-descriptions-item>
        <el-descriptions-item label="直播间URL">{{ videoDetail?.liveroom_url || '无' }}</el-descriptions-item>
        <el-descriptions-item label="视频类型">
          <el-tag v-if="videoDetail?.video_type" :type="videoDetail.video_type === 'hls' ? 'info' : 'success'">
            {{ videoDetail.video_type.toUpperCase() }}
          </el-tag>
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="视频格式">{{ videoDetail?.format || '无' }}</el-descriptions-item>
        <el-descriptions-item label="分辨率">{{ videoDetail?.resolution || '无' }}</el-descriptions-item>
        <el-descriptions-item label="时长">{{ formatDuration(videoDetail?.duration) }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatFileSize(videoDetail?.file_size) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="videoDetail?.status" :type="videoStatusType(videoDetail.status)">
            {{ videoStatusText(videoDetail.status) }}
          </el-tag>
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="原始视频URL" :span="2">
          <span class="url-text">{{ videoDetail?.video_url || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="存储路径" :span="2">
          <span class="path-text">{{ videoDetail?.storage_path || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="封面URL" :span="2">
          <span class="url-text">{{ videoDetail?.cover_url || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="封面存储路径" :span="2">
          <span class="path-text">{{ videoDetail?.cover_path || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="开始下载时间">{{ formatTime(videoDetail?.download_start_time) || '无' }}</el-descriptions-item>
        <el-descriptions-item label="完成下载时间">{{ formatTime(videoDetail?.download_end_time) || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(videoDetail?.created_at) || '无' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(videoDetail?.updated_at) || '无' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 操作按钮 -->
    <div style="margin-top: 24px;">
      <el-button @click="goTaskDetail">返回任务详情</el-button>
      <el-button type="primary" @click="refreshData">刷新数据</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDownloadedVideosByTask } from '@/api/download'
import { formatTime } from '@/utils/time'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

// 数据状态
const loading = ref(false)
const videoDetail = ref(null)

// 获取已下载视频详细信息
const fetchVideoDetail = async () => {
  loading.value = true
  try {
    const params = {
      page: 1,
      size: 1
    }
    const response = await getDownloadedVideosByTask(route.params.taskId, params)
    const videos = response.data.data.items || []
    videoDetail.value = videos.length > 0 ? videos[0] : null
  } catch (error) {
    console.error('获取已下载视频失败:', error)
    ElMessage.error('获取已下载视频失败')
    videoDetail.value = null
  } finally {
    loading.value = false
  }
}

// 页面初始化
onMounted(() => {
  fetchVideoDetail()
})

// 导航函数
const goBack = () => {
  router.push('/download-center/videos')
}

const goTaskDetail = () => {
  router.push(`/download-center/tasks/${route.params.taskId}`)
}

// 刷新数据
const refreshData = () => {
  fetchVideoDetail()
}

// 工具函数
const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '无'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '无'
  if (seconds === 0) return '00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

const getFileName = (storagePath) => {
  if (!storagePath) return '未知文件'
  const parts = storagePath.split('/')
  return parts[parts.length - 1] || storagePath
}

// 视频状态相关 (根据数据库表的status字段: completed, partial_completed, failed)
const videoStatusType = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'partial_completed') return 'warning'
  if (status === 'failed') return 'danger'
  return ''
}

const videoStatusText = (status) => {
  const map = {
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败'
  }
  return map[status] || status
}
</script>

<style scoped>
.detail-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px #0000000d;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
}

.header-id {
  color: #888;
  font-size: 14px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 200px;
}

.url-text {
  word-break: break-all;
  color: #409eff;
  font-family: monospace;
  font-size: 12px;
}

.path-text {
  word-break: break-all;
  color: #67c23a;
  font-family: monospace;
  font-size: 12px;
}

.loading-container {
  text-align: center;
  padding: 40px 0;
  color: #666;
}

.no-data {
  padding: 40px 0;
}

.id-text {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}
</style>
