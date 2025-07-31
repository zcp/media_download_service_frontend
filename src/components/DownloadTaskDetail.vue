<template>
  <el-card shadow="never" class="detail-card">
    <template #header>
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <span class="header-title">任务详情</span>
            <span class="header-id">ID: {{ detail?.id }}</span>
          </div>
        </template>
      </el-page-header>
    </template>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="视频ID">{{ detail?.video_id }}</el-descriptions-item>
      <el-descriptions-item label="直播间ID">{{ detail?.liveroom_id }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ detail?.resource_type }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="statusType(detail?.status)">{{ statusText(detail?.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="进度">
        <el-progress :percentage="Math.round((detail?.progress || 0) * 100)" :status="progressStatus(detail?.status)" />
      </el-descriptions-item>
      <el-descriptions-item label="重试次数">{{ detail?.retry_count }}</el-descriptions-item>
      <el-descriptions-item label="最后错误">{{ formattedLastError }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatTime(detail?.created_at) }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ formatTime(detail?.updated_at) }}</el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ formatTime(detail?.completed_at) }}</el-descriptions-item>
    </el-descriptions>
    
    <!-- 任务操作按钮 -->
    <div v-if="hasTaskOperations" style="margin-top: 24px;">
      <h4 style="margin-bottom: 12px; color: #333; font-size: 16px;">任务操作</h4>
      <el-space>
        <el-button @click="goFailures" v-if="['failed','partial_completed'].includes(detail?.status)">查看失败记录</el-button>
        <el-button @click="pause" v-if="detail?.status==='processing'">暂停</el-button>
        <el-button @click="resume" v-if="detail?.status==='failed'">恢复</el-button>
        <el-button @click="retry" v-if="detail?.status==='failed'">重试</el-button>
        <el-button type="danger" @click="cancel" v-if="['pending','processing'].includes(detail?.status)">取消</el-button>
      </el-space>
    </div>

    <!-- 页面操作按钮 -->
    <div style="margin-top: 24px;">
      <el-button @click="goTasksList">返回下载任务列表</el-button>
      <el-button type="primary" @click="refreshData">刷新数据</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { useDownloadStore } from '@/store/download'
import { storeToRefs } from 'pinia'
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatTime } from '@/utils/time'
import { ElMessageBox, ElMessage } from 'element-plus'

const store = useDownloadStore()
const { taskDetail: detail, loading } = storeToRefs(store)
const route = useRoute()
const router = useRouter()

onMounted(() => store.fetchTaskDetail(route.params.taskId))

const formattedLastError = computed(() => {
  const error = detail.value?.last_error;
  if (!error || error.trim() === '') {
    return '无';
  }
  const maxLength = 100;
  if (error.length > maxLength) {
    return `${error.slice(0, maxLength)}...`;
  }
  return error;
});

// 计算是否有任务操作按钮
const hasTaskOperations = computed(() => {
  if (!detail.value?.status) return false;
  return ['failed', 'partial_completed', 'processing', 'pending'].includes(detail.value.status);
});

const goBack = () => {
  if (route.query.fromPage) {
    router.push({ path: '/download-center/tasks', query: { page: route.query.fromPage } })
  } else {
    router.push('/download-center/tasks')
  }
}

// 返回任务列表（与 goBack 功能相同，保持一致性）
const goTasksList = () => {
  if (route.query.fromPage) {
    router.push({ path: '/download-center/tasks', query: { page: route.query.fromPage } })
  } else {
    router.push('/download-center/tasks')
  }
}

// 刷新数据
const refreshData = async () => {
  await store.fetchTaskDetail(route.params.taskId)
  ElMessage.success('数据已刷新')
}

const goFailures = () => router.push(`/download-center/tasks/${route.params.taskId}/failures`)
const goVideos = () => router.push(`/download-center/tasks/${route.params.taskId}/videos`)

const pause = async () => {
  try {
    // 这里需要调用暂停任务的 API
    ElMessage.info('暂停功能待实现')
  } catch (error) {
    ElMessage.error('暂停任务失败')
  }
}

const resume = async () => {
  try {
    // 这里需要调用恢复任务的 API  
    ElMessage.info('恢复功能待实现')
  } catch (error) {
    ElMessage.error('恢复任务失败')
  }
}

const retry = async () => {
  await store.retryDownloadTask(route.params.taskId)
  await store.fetchTaskDetail(route.params.taskId)
}
const cancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该下载任务吗？取消后无法恢复', '取消确认', {
        confirmButtonText: '确定取消',
        cancelButtonText: '再想想',
        type: 'warning'
    });
    await store.deleteDownloadTask(route.params.taskId)
    ElMessage.success('任务已取消')
    router.push('/download-center/tasks')
  } catch(e) {
    if (e !== 'cancel') {
        ElMessage.error('操作失败')
    } else {
        ElMessage.info('操作已取消')
    }
  }
}

const statusType = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'info'
  if (status === 'partial_completed') return 'warning'
  return ''
}
const statusText = (status) => {
  const map = {
    pending: '待处理',
    processing: '进行中',
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return map[status] || status
}
const progressStatus = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'exception'
  return 'active'
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

.header-id {
  color: #888;
  font-size: 14px;
}
</style>
