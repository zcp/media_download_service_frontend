<template>
  <div class="task-detail-page">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="detail-header">
        <div class="header-left">
          <el-button @click="goBack" :icon="ArrowLeft" type="text">返回</el-button>
          <h2 class="page-title">任务详情</h2>
          <el-tag :type="getStatusTagType(task?.status)" size="large" v-if="task">
            {{ getStatusText(task.status) }}
          </el-tag>
        </div>
        <div class="header-right" v-if="task">
          <el-button 
            v-if="canStart(task.status)"
            type="success" 
            @click="handleStart"
            :loading="starting"
          >
            开始下载
          </el-button>
          <el-button 
            v-if="canRetry(task.status)"
            type="warning" 
            @click="handleRetry"
            :loading="retrying"
          >
            重试任务
          </el-button>
          <el-button 
            v-if="canCancel(task.status)"
            type="danger" 
            @click="handleCancel"
            :loading="canceling"
          >
            取消任务
          </el-button>
          <el-button @click="refreshDetail" :loading="loading">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 任务详情内容 -->
    <div class="detail-content" v-loading="loading">
      <el-row :gutter="24" v-if="task">
        <!-- 基本信息 -->
        <el-col :span="24" :lg="16">
          <el-card title="基本信息" shadow="never">
            <div class="info-grid">
              <div class="info-item">
                <label>任务ID:</label>
                <span>{{ task.id }}</span>
              </div>
              <div class="info-item">
                <label>视频ID:</label>
                <span>{{ task.video_id }}</span>
              </div>
              <div class="info-item">
                <label>直播间ID:</label>
                <span>{{ task.liveroom_id }}</span>
              </div>
              <div class="info-item">
                <label>直播间标题:</label>
                <span>{{ task.liveroom_title || '-' }}</span>
              </div>
              <div class="info-item">
                <label>资源类型:</label>
                <el-tag>{{ task.resource_type.toUpperCase() }}</el-tag>
              </div>
              <div class="info-item">
                <label>资源URL:</label>
                <el-link :href="task.resource_url" target="_blank" type="primary">
                  {{ truncateUrl(task.resource_url) }}
                </el-link>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 状态信息 -->
        <el-col :span="24" :lg="8">
          <el-card title="状态信息" shadow="never">
            <div class="status-info">
              <div class="progress-section">
                <label>下载进度:</label>
                <el-progress 
                  :percentage="Math.round(task.progress * 100)"
                  :color="getProgressColor(task.status)"
                  :status="getProgressStatus(task.status)"
                  stroke-width="16"
                />
              </div>
              <div class="info-item">
                <label>重试次数:</label>
                <span>{{ task.retry_count }}</span>
              </div>
              <div class="info-item">
                <label>创建时间:</label>
                <span>{{ formatDateTime(task.created_at) }}</span>
              </div>
              <div class="info-item">
                <label>更新时间:</label>
                <span>{{ formatDateTime(task.updated_at) }}</span>
              </div>
              <div class="info-item" v-if="task.completed_at">
                <label>完成时间:</label>
                <span>{{ formatDateTime(task.completed_at) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 错误信息 -->
        <el-col :span="24" v-if="task.last_error">
          <el-card title="错误信息" shadow="never">
            <el-alert
              :title="task.last_error"
              type="error"
              :closable="false"
              show-icon
            />
          </el-card>
        </el-col>

        <!-- 操作区域 -->
        <el-col :span="24">
          <el-card title="相关操作" shadow="never">
            <div class="action-buttons">
              <el-button 
                type="primary" 
                @click="goToFailures"
                v-if="hasFailures(task.status)"
              >
                查看失败记录
              </el-button>
              <el-button type="success" @click="goToVideos">
                查看已下载视频
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 加载状态 -->
      <div v-if="loading && !task" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- 错误状态 -->
      <div v-if="error" class="error-container">
        <el-result
          icon="error"
          title="加载失败"
          :sub-title="error"
        >
          <template #extra>
            <el-button type="primary" @click="refreshDetail">重新加载</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDownloadStore } from '@/stores/download';
import { formatDateTime } from '@/utils/time';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const downloadStore = useDownloadStore();

const loading = ref(false);
const error = ref('');
const starting = ref(false);
const retrying = ref(false);
const canceling = ref(false);
const pollingTimer = ref(null);

const taskId = computed(() => route.params.taskId);
const task = computed(() => downloadStore.currentTask);

// 生命周期
onMounted(async () => {
  await loadTaskDetail();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
  downloadStore.clearCurrentTask();
});

// 加载任务详情
const loadTaskDetail = async () => {
  if (!taskId.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await downloadStore.fetchTaskDetail(taskId.value);
  } catch (err) {
    error.value = err.message || '加载任务详情失败';
  } finally {
    loading.value = false;
  }
};

// 刷新详情
const refreshDetail = async () => {
  await loadTaskDetail();
  ElMessage.success('刷新成功');
};

// 开始轮询
const startPolling = () => {
  if (pollingTimer.value) return;
  
  pollingTimer.value = setInterval(() => {
    if (task.value && ['processing', 'pending'].includes(task.value.status)) {
      loadTaskDetail();
    }
  }, 3000);
};

// 停止轮询
const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value);
    pollingTimer.value = null;
  }
};

// 开始下载任务
const handleStart = async () => {
  try {
    await ElMessageBox.confirm('确定要开始下载此任务吗？', '确认开始下载', {
      type: 'info'
    });
    
    starting.value = true;
    await downloadStore.startTask(taskId.value);
    
    ElMessage.success('任务开始下载成功');
    await loadTaskDetail();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('开始下载失败');
    }
  } finally {
    starting.value = false;
  }
};

// 重试任务
const handleRetry = async () => {
  try {
    await ElMessageBox.confirm('确定要重试此任务吗？', '确认重试', {
      type: 'warning'
    });
    
    retrying.value = true;
    await downloadStore.retryTask(taskId.value);
    
    ElMessage.success('任务重试成功');
    await loadTaskDetail();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重试失败');
    }
  } finally {
    retrying.value = false;
  }
};

// 取消任务
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消此任务吗？', '确认取消', {
      type: 'warning'
    });
    
    canceling.value = true;
    await downloadStore.deleteTask(taskId.value);
    
    ElMessage.success('任务已取消');
    router.push('/download-center/tasks');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败');
    }
  } finally {
    canceling.value = false;
  }
};

// 导航方法
const goBack = () => router.back();
const goToFailures = () => router.push(`/download-center/tasks/${taskId.value}/failures`);
const goToVideos = () => router.push(`/download-center/tasks/${taskId.value}/videos`);

// 工具函数
const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败',
    cancelled: '已取消'
  };
  return map[status] || status;
};

const getStatusTagType = (status) => {
  const map = {
    pending: '',
    processing: 'warning',
    completed: 'success',
    partial_completed: 'warning',
    failed: 'danger',
    cancelled: 'info'
  };
  return map[status] || '';
};

const getProgressColor = (status) => {
  const map = {
    completed: '#67C23A',
    failed: '#F56C6C',
    processing: '#409EFF'
  };
  return map[status] || '#409EFF';
};

const getProgressStatus = (status) => {
  return status === 'failed' ? 'exception' : undefined;
};

const canStart = (status) => {
  // 可以开始下载的状态：仅待处理
  return ['pending'].includes(status);
};

const canRetry = (status) => {
  // 可以重试的状态：失败、已取消、部分完成
  return ['failed', 'cancelled', 'partial_completed'].includes(status);
};
const canCancel = (status) => ['pending', 'processing'].includes(status);
const hasFailures = (status) => ['failed', 'partial_completed'].includes(status);

const truncateUrl = (url) => {
  return url.length > 60 ? `${url.slice(0, 60)}...` : url;
};
</script>

<style scoped>
.task-detail-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.header-card {
  margin-bottom: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-item label {
  min-width: 100px;
  font-weight: 500;
  color: #6b7280;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.loading-container,
.error-container {
  padding: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .task-detail-page {
    padding: 16px;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-right {
    justify-content: center;
  }
}
</style>