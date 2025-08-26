<template>
  <div class="failures-page">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-button @click="goBack" :icon="ArrowLeft" type="text">返回</el-button>
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>
        <div class="header-right">
          <el-button @click="refreshFailures" :loading="loading">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 失败记录表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="downloadStore.failures"
        :loading="loading"
        border
        stripe
        height="600"
        v-loading="loading"
      >
        <el-table-column prop="id" label="失败ID" width="280" show-overflow-tooltip />
        
        <el-table-column prop="resource_url" label="资源URL" width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link :href="row.resource_url" target="_blank" type="primary">
              {{ truncateUrl(row.resource_url) }}
            </el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="resource_type" label="资源类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.resource_type.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="failure_type" label="失败类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getFailureTypeTagType(row.failure_type)" size="small">
              {{ getFailureTypeText(row.failure_type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="error_message" label="错误信息" width="250" show-overflow-tooltip />
        
        <el-table-column prop="retry_count" label="重试次数" width="100" align="center" />
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at, 'MM-DD HH:mm') }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right" v-if="!isGlobalFailures">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="handleRetry(row.id)"
              :loading="retryingFailures.has(row.id)"
            >
              重试
            </el-button>
            <el-button 
              v-if="row.status !== 'abandoned'"
              size="small" 
              type="danger" 
              @click="handleAbandon(row.id)"
              :loading="abandoningFailures.has(row.id)"
            >
              放弃
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-area">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="downloadStore.failuresTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDownloadStore } from '@/stores/download';
import { formatDateTime } from '@/utils/time';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const downloadStore = useDownloadStore();

const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const retryingFailures = ref(new Set());
const abandoningFailures = ref(new Set());

const taskId = computed(() => route.params.taskId);

// 页面标题计算属性
const pageTitle = computed(() => {
  return taskId.value ? `任务 ${taskId.value} 的失败记录` : '下载失败记录';
});

// 是否为全局失败记录页面
const isGlobalFailures = computed(() => !taskId.value);

onMounted(async () => {
  await fetchFailures();
});

const fetchFailures = async () => {
  loading.value = true;
  try {
    // 如果是全局失败记录页面，不传递taskId
    const taskIdToUse = isGlobalFailures.value ? null : taskId.value;
    await downloadStore.fetchFailures(taskIdToUse, {
      page: currentPage.value,
      size: pageSize.value
    });
  } catch (error) {
    ElMessage.error('获取失败记录失败');
  } finally {
    loading.value = false;
  }
};

const refreshFailures = async () => {
  await fetchFailures();
  ElMessage.success('刷新成功');
};

const handleRetry = async (failureId) => {
  try {
    await ElMessageBox.confirm('确定要重试此失败资源吗？', '确认重试', {
      type: 'warning'
    });
    
    retryingFailures.value.add(failureId);
    
    if (isGlobalFailures.value) {
      ElMessage.warning('全局失败记录页面暂不支持重试操作，请到具体任务页面操作');
      return;
    }
    
    await downloadStore.retryFailure(taskId.value, failureId);
    
    ElMessage.success('重试成功');
    await fetchFailures();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重试失败');
    }
  } finally {
    retryingFailures.value.delete(failureId);
  }
};

const handleAbandon = async (failureId) => {
  try {
    await ElMessageBox.confirm('确定要放弃此失败资源吗？', '确认放弃', {
      type: 'warning'
    });
    
    abandoningFailures.value.add(failureId);
    
    if (isGlobalFailures.value) {
      ElMessage.warning('全局失败记录页面暂不支持放弃操作，请到具体任务页面操作');
      return;
    }
    
    await downloadStore.abandonFailure(taskId.value, failureId);
    
    ElMessage.success('已放弃');
    await fetchFailures();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  } finally {
    abandoningFailures.value.delete(failureId);
  }
};

const handleSizeChange = async (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  await fetchFailures();
};

const handleCurrentChange = async (newPage) => {
  currentPage.value = newPage;
  await fetchFailures();
};

const goBack = () => router.back();

// 工具函数
const truncateUrl = (url) => url.length > 50 ? `${url.slice(0, 50)}...` : url;

const getFailureTypeText = (type) => {
  const map = {
    network_error: '网络错误',
    timeout: '超时',
    invalid_content: '内容无效',
    storage_error: '存储错误',
    permission_error: '权限错误'
  };
  return map[type] || type;
};

const getFailureTypeTagType = (type) => {
  const map = {
    network_error: 'danger',
    timeout: 'warning',
    invalid_content: 'danger',
    storage_error: 'danger',
    permission_error: 'warning'
  };
  return map[type] || '';
};

const getStatusText = (status) => {
  const map = {
    pending: '待重试',
    retrying: '重试中',
    abandoned: '已放弃'
  };
  return map[status] || status;
};

const getStatusTagType = (status) => {
  const map = {
    pending: 'warning',
    retrying: 'primary',
    abandoned: 'info'
  };
  return map[status] || '';
};
</script>

<style scoped>
.failures-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.header-card {
  margin-bottom: 24px;
}

.page-header {
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

.pagination-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .failures-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>