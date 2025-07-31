<template>
  <el-card shadow="never" class="detail-card">
    <template #header>
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <span class="header-title">下载失败详情</span>
          </div>
        </template>
      </el-page-header>
    </template>

    <!-- 失败记录详细信息 -->
    <div v-if="loading" class="loading-container">
      <el-loading></el-loading>
      <p>加载中...</p>
    </div>
    
    <div v-else style="margin-top: 0;">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="失败记录ID" :span="2">
          <span class="id-text">{{ failureDetail?.failure_id || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="任务ID" :span="2">
          <span class="id-text">{{ failureDetail?.task_id || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="标准文件名" :span="2">
          <span class="filename-text">{{ failureDetail?.standard_name || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="资源类型">
          <el-tag v-if="failureDetail?.resource_type" size="small" :type="resourceTypeColor(failureDetail.resource_type)">
            {{ failureDetail.resource_type.toUpperCase() }}
          </el-tag>
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="失败类型">
          <el-tag v-if="failureDetail?.failure_type" size="small" :type="failureTypeColor(failureDetail.failure_type)">
            {{ failureTypeText(failureDetail.failure_type) }}
          </el-tag>
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="重试次数">{{ failureDetail?.retry_count || 0 }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="failureDetail?.status" :type="statusType(failureDetail.status)">
            {{ statusText(failureDetail.status) }}
          </el-tag>
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="资源URL" :span="2">
          <span class="url-text">{{ failureDetail?.resource_url || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="期望保存路径" :span="2">
          <span class="path-text">{{ failureDetail?.expected_path || '无' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2">
          <div class="error-message">{{ failureDetail?.error_message || '无' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="下次重试时间" :span="2">
          {{ formatTime(failureDetail?.next_retry_time) || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(failureDetail?.created_at) || '无' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(failureDetail?.updated_at) || '无' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 操作按钮 -->
    <div style="margin-top: 24px;">
      <el-button @click="goFailuresList">返回下载失败列表</el-button>
      <el-button type="primary" @click="refreshData">刷新数据</el-button>
      <el-button v-if="failureDetail?.task_id" type="info" @click="goTaskDetail">查看任务详情</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFailureDetail } from '@/api/download'
import { formatTime } from '@/utils/time'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

// 数据状态
const loading = ref(false)
const failureDetail = ref(null)

// 获取失败记录详细信息
const fetchFailureDetail = async () => {
  loading.value = true
  try {
    const response = await getFailureDetail(route.params.failureId)
    failureDetail.value = response.data.data || null
  } catch (error) {
    console.error('获取失败记录详情失败:', error)
    ElMessage.error('获取失败记录详情失败')
    failureDetail.value = null
  } finally {
    loading.value = false
  }
}

// 页面初始化
onMounted(() => {
  fetchFailureDetail()
})

// 导航函数
const goBack = () => {
  router.push('/download-center/failures')
}

const goFailuresList = () => {
  router.push('/download-center/failures')
}

const goTaskDetail = () => {
  if (failureDetail.value?.task_id) {
    router.push(`/download-center/tasks/${failureDetail.value.task_id}`)
  }
}

// 刷新数据
const refreshData = () => {
  fetchFailureDetail()
}

// 工具函数
const resourceTypeColor = (type) => {
  const map = {
    m3u8: 'info',
    ts: 'warning',
    mp4: 'success',
    image: ''
  }
  return map[type] || ''
}

const failureTypeColor = (type) => {
  const map = {
    network_error: 'danger',
    timeout: 'warning',
    invalid_content: 'info',
    storage_error: 'danger',
    permission_error: 'warning'
  }
  return map[type] || ''
}

const failureTypeText = (type) => {
  const map = {
    network_error: '网络错误',
    timeout: '超时',
    invalid_content: '内容无效',
    storage_error: '存储错误',
    permission_error: '权限错误'
  }
  return map[type] || type
}

const statusType = (status) => {
  if (status === 'pending') return ''
  if (status === 'retrying') return 'info'
  if (status === 'abandoned') return 'danger'
  return ''
}

const statusText = (status) => {
  const map = {
    pending: '待处理',
    retrying: '重试中',
    abandoned: '已放弃'
  }
  return map[status] || status
}
</script>

<style scoped>
.detail-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px #0000000d;
}

/* 统一表格字体样式 */
.detail-card :deep(.el-descriptions-item__cell) {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #000;
}

.detail-card :deep(.el-descriptions-item__label) {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #000;
}

/* 确保所有描述内容使用统一字体 */
.detail-card :deep(.el-descriptions-item__content) {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #000;
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

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 200px;
}

.url-text {
  word-break: break-all;
  color: #000;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.path-text {
  word-break: break-all;
  color: #000;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.filename-text {
  word-break: break-all;
  color: #000;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.error-message {
  color: #f56c6c;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
  background: #fef0f0;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #fbc4c4;
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
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #000;
  word-break: break-all;
  line-height: 1.5;
}
</style>