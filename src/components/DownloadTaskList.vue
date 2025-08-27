<template>
  <div class="task-list-page">
    <!-- 操作区域 -->
    <el-card class="operation-card" shadow="never">
      <div class="operation-header">
        <div class="header-left">
          <h2 class="page-title">下载任务列表</h2>
          <el-tag type="info" size="large">
            共 {{ downloadStore.tasksTotal }} 个任务
          </el-tag>
        </div>
      </div>
      
      <!-- 新增：操作按钮区域 -->
      <div class="operation-buttons">
        <div class="button-group">
          <el-button 
            type="primary" 
            :icon="Plus" 
            @click="goToCreate"
          >
            创建任务
          </el-button>
          
          <!-- 批量操作按钮 - 始终显示，根据选择状态启用/禁用 -->
          <el-button 
            type="success" 
            @click="handleBatchStart"
            :loading="batchStarting"
            :disabled="selectedTasks.length === 0 || !hasStartableTasks"
            :class="{ 'button-disabled': selectedTasks.length === 0 || !hasStartableTasks }"
          >
            批量下载 ({{ startableTasksCount }})
          </el-button>
          
          <el-button 
            type="warning" 
            @click="handleBatchRetry"
            :loading="batchRetrying"
            :disabled="selectedTasks.length === 0 || !hasRetryableTasks"
            :class="{ 'button-disabled': selectedTasks.length === 0 || !hasRetryableTasks }"
          >
            批量重试 ({{ retryableTasksCount }})
          </el-button>
          
          <el-button 
            :icon="Refresh" 
            @click="refreshTasks"
            :loading="downloadStore.tasksLoading"
          >
            刷新
          </el-button>
        </div>
      </div>
      <!-- 筛选区域 -->
      <div class="filter-area">
        <el-form 
          :model="filterForm" 
          inline 
          @submit.prevent="handleSearch"
        >
          <el-form-item label="状态">
            <el-select 
              v-model="filterForm.status" 
              placeholder="选择状态"
              clearable
              style="width: 140px"
            >
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="部分完成" value="partial_completed" />
              <el-option label="失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="资源类型">
            <el-select 
              v-model="filterForm.resource_type" 
              placeholder="选择类型"
              clearable
              style="width: 120px"
            >
              <el-option label="HLS" value="hls" />
              <el-option label="MP4" value="mp4" />
              <el-option label="图片" value="image" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="直播间ID">
            <el-input 
              v-model="filterForm.liveroom_id" 
              placeholder="输入直播间ID"
              clearable
              style="width: 160px"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 表格区域 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="downloadStore.tasks"
        border
        stripe
        height="600"
        @row-click="handleRowClick"
        @selection-change="handleSelectionChange"
        element-loading-text="加载中..."
      >
      <!-- 新增：批量选择列 -->
      <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="任务ID" width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click.stop="goToDetail(row.id)">
              {{ formatTaskId(row.id) }}
            </el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="video_id" label="视频ID" width="200" show-overflow-tooltip />
        
        <el-table-column prop="liveroom_id" label="直播间ID" width="120" />
        
        <el-table-column prop="resource_type" label="资源类型" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getResourceTypeTagType(row.resource_type)"
              size="small"
            >
              {{ row.resource_type.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusTagType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress 
              :percentage="Math.round(row.progress * 100)"
              :color="getProgressColor(row.status)"
              :show-text="true"
              text-inside
              stroke-width="16"
            />
          </template>
        </el-table-column>
        
        <el-table-column prop="retry_count" label="重试次数" width="100" align="center" />
        
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at, 'MM-DD HH:mm') }}
          </template>
        </el-table-column>
        
        <el-table-column prop="updated_at" label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatRelativeTime(row.updated_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                size="small" 
                type="primary" 
                @click.stop="goToDetail(row.id)"
              >
                详情
              </el-button>
              
              <!-- 主要操作按钮：根据状态显示不同的按钮 -->
              <el-button 
                v-if="canStart(row.status)"
                size="small" 
                type="success" 
                @click.stop="handleStart(row.id)"
                :loading="startingTasks.has(row.id)"
              >
                开始下载
              </el-button>
              
              <el-button 
                v-if="canRetry(row.status)"
                size="small" 
                type="warning" 
                @click.stop="handleRetry(row.id)"
                :loading="retryingTasks.has(row.id)"
              >
                重试
              </el-button>
              
              <el-button 
                v-if="canCancel(row.status)"
                size="small" 
                type="danger" 
                @click.stop="handleCancel(row.id)"
                :loading="cancelingTasks.has(row.id)"
              >
                取消
              </el-button>
              
              <el-dropdown 
                @command="(command) => handleDropdownAction(command, row)"
                @click.stop
              >
                <el-button size="small" type="info">
                  更多 <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-if="hasFailures(row.status)"
                      :command="`failures:${row.id}`"
                    >
                      <el-icon><Warning /></el-icon>
                      失败记录
                    </el-dropdown-item>
                    <el-dropdown-item :command="`videos:${row.id}`">
                      <el-icon><VideoPlay /></el-icon>
                      已下载视频
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页区域 -->
      <div class="pagination-area">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="downloadStore.tasksTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDownloadStore } from '@/stores/download';
import { formatDateTime, formatRelativeTime } from '@/utils/time';
import { 
  Plus, 
  Refresh, 
  ArrowDown,
  Warning, 
  VideoPlay 
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const downloadStore = useDownloadStore();

// 筛选表单
const filterForm = reactive({
  status: '',
  resource_type: '',
  liveroom_id: ''
});

// 分页参数
const currentPage = ref(1);
const pageSize = ref(20);

// 操作状态
const retryingTasks = ref(new Set());
const cancelingTasks = ref(new Set());
const startingTasks = ref(new Set());

// 新增：批量操作状态
const selectedTasks = ref([]);
const batchStarting = ref(false);
const batchRetrying = ref(false);

// 计算属性
const searchParams = computed(() => ({
  page: currentPage.value,
  size: pageSize.value,
  sort: 'created_at:desc',
  ...filterForm
}));

// 静默刷新
const silentRefreshTasks = async () => {
  await downloadStore.fetchTasks(searchParams.value, false);
};

// 新增：批量选择处理
const handleSelectionChange = (selection) => {
  selectedTasks.value = selection;
};

// 新增：计算可操作的任务数量
const startableTasksCount = computed(() => {
  return selectedTasks.value.filter(task => canStart(task.status)).length;
});

const retryableTasksCount = computed(() => {
  return selectedTasks.value.filter(task => canRetry(task.status)).length;
});

const hasStartableTasks = computed(() => startableTasksCount.value > 0);
const hasRetryableTasks = computed(() => retryableTasksCount.value > 0);


// 生命周期
onMounted(async () => {
  console.log('任务列表页面已挂载');
  await fetchTasks();
});

onUnmounted(() => {
  console.log('任务列表页面已卸载');
});

// 监控任务状态变化，提供完成通知
watch(
  () => downloadStore.tasks,
  (newTasks, oldTasks) => {
    if (!oldTasks || oldTasks.length === 0) return;
    
    // 检查是否有任务状态发生变化
    newTasks.forEach((newTask, index) => {
      const oldTask = oldTasks[index];
      if (oldTask && oldTask.status !== newTask.status) {
        // 状态发生变化，检查是否是完成状态
        if (newTask.status === 'completed') {
          ElMessage.success(`任务 ${formatTaskId(newTask.id)} 下载完成！`);
        } else if (newTask.status === 'failed') {
          ElMessage.error(`任务 ${formatTaskId(newTask.id)} 下载失败，请检查重试`);
        } else if (newTask.status === 'partial_completed') {
          ElMessage.warning(`任务 ${formatTaskId(newTask.id)} 部分完成，请检查详情`);
        }
      }
    });
  },
  { deep: true }
);

// 获取任务列表
const fetchTasks = async () => {
  try {
    await downloadStore.fetchTasks(searchParams.value);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    ElMessage.error('获取任务列表失败');
  }
};

// 刷新任务列表
const refreshTasks = async () => {
  await fetchTasks();
  ElMessage.success('刷新成功');
};

// 搜索
const handleSearch = async () => {
  currentPage.value = 1;
  await fetchTasks();
};

// 重置搜索
const handleReset = async () => {
  Object.keys(filterForm).forEach(key => {
    filterForm[key] = '';
  });
  currentPage.value = 1;
  await fetchTasks();
};

// 分页处理
const handleSizeChange = async (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  await fetchTasks();
};

const handleCurrentChange = async (newPage) => {
  currentPage.value = newPage;
  await fetchTasks();
};

// 导航方法
const goToCreate = () => {
  router.push('/download-center/tasks/create');
};

const goToDetail = (taskId) => {
  router.push(`/download-center/tasks/${taskId}`);
};

const goToFailures = (taskId) => {
  router.push(`/download-center/tasks/${taskId}/failures`);
};

const goToVideos = (taskId) => {
  router.push(`/download-center/tasks/${taskId}/videos`);
};

// 表格行点击
const handleRowClick = (row) => {
  goToDetail(row.id);
};

// 开始下载任务 - 异步执行，不阻塞用户操作
const handleStart = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要开始下载此任务吗？', '确认开始下载', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });

    // 立即添加到正在下载的集合中，禁用按钮
    startingTasks.value.add(taskId);
    
    // 显示开始下载的提示
    ElMessage.info('正在启动下载任务，请稍候...');
    
    // 异步执行下载任务，不等待结果
    downloadStore.startTask(taskId)
      .then(() => {
        ElMessage.success('任务开始下载成功');
        // 延迟刷新，避免频繁API调用
        setTimeout(() => silentRefreshTasks(), 1000);
      })
      .catch((error) => {
        console.error('开始下载任务失败:', error);
        ElMessage.error('开始下载任务失败，请重试');
        // 延迟刷新
        setTimeout(() => silentRefreshTasks(), 1000);
      })
      .finally(() => {
        // 无论成功失败，都要从正在下载集合中移除
        startingTasks.value.delete(taskId);
      });
      
      
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始下载任务失败:', error);
      ElMessage.error('开始下载任务失败');
    }
  }
};

// 重试任务 - 异步执行，不阻塞用户操作
const handleRetry = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要重试此任务吗？', '确认重试', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    // 立即添加到正在重试的集合中，禁用按钮
    retryingTasks.value.add(taskId);
    
    // 显示开始重试的提示
    ElMessage.info('正在重试任务，请稍候...');
    
    // 异步执行重试任务，不等待结果
    downloadStore.retryTask(taskId)
      .then(() => {
        // 重试启动成功
        ElMessage.success('任务重试成功');
        // 刷新任务列表以更新状态
        setTimeout(() => silentRefreshTasks(), 1000);
      })
      .catch((error) => {
        // 重试启动失败
        console.error('重试任务失败:', error);
        ElMessage.error('重试任务失败，请重试');
        // 刷新任务列表以更新状态
        setTimeout(() => silentRefreshTasks(), 1000);
      })
      .finally(() => {
        // 无论成功失败，都要从正在重试集合中移除
        retryingTasks.value.delete(taskId);
      });
      
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重试任务失败:', error);
      ElMessage.error('重试任务失败');
    }
  }
};

// 取消任务
const handleCancel = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要取消此任务吗？此操作不可撤销。', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    cancelingTasks.value.add(taskId);
    
    await downloadStore.deleteTask(taskId);
    ElMessage.success('任务已取消');
    
    await fetchTasks();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error);
      ElMessage.error('取消任务失败');
    }
  } finally {
    cancelingTasks.value.delete(taskId);
  }
};

// 下拉菜单操作
const handleDropdownAction = (command, row) => {
  const [action, taskId] = command.split(':');
  
  switch (action) {
    case 'failures':
      goToFailures(taskId);
      break;
    case 'videos':
      goToVideos(taskId);
      break;
  }
};


// 新增：批量开始下载任务
const handleBatchStart = async () => {
  const startableTasks = selectedTasks.value.filter(task => canStart(task.status));
  
  if (startableTasks.length === 0) {
    ElMessage.warning('没有可开始下载的任务');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要开始下载 ${startableTasks.length} 个任务吗？`, 
      '确认批量开始下载', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    );

    batchStarting.value = true;
    
    // 将所有可开始的任务ID添加到startingTasks集合
    startableTasks.forEach(task => startingTasks.value.add(task.id));
    
    ElMessage.info(`正在启动 ${startableTasks.length} 个下载任务，请稍候...`);
    
    // 并行执行所有开始下载操作
    const promises = startableTasks.map(task => 
      downloadStore.startTask(task.id)
        .then(() => {
          ElMessage.success(`任务 ${formatTaskId(task.id)} 开始下载成功`);
        })
        .catch((error) => {
          console.error(`开始下载任务 ${task.id} 失败:`, error);
          ElMessage.error(`任务 ${formatTaskId(task.id)} 开始下载失败`);
        })
        .finally(() => {
          startingTasks.value.delete(task.id);
        })
    );
    
    // 等待所有操作完成
    await Promise.allSettled(promises);
    
    // 延迟刷新，避免频繁API调用
    setTimeout(() => silentRefreshTasks(), 1000);
    
    ElMessage.success(`批量操作完成，成功启动 ${startableTasks.length} 个任务`);
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量开始下载失败:', error);
      ElMessage.error('批量开始下载失败');
    }
  } finally {
    batchStarting.value = false;
    // 清理所有任务ID
    startableTasks.forEach(task => startingTasks.value.delete(task.id));
  }
};

// 新增：批量重试任务
const handleBatchRetry = async () => {
  const retryableTasks = selectedTasks.value.filter(task => canRetry(task.status));
  
  if (retryableTasks.length === 0) {
    ElMessage.warning('没有可重试的任务');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要重试 ${retryableTasks.length} 个任务吗？`, 
      '确认批量重试', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    batchRetrying.value = true;
    
    // 将所有可重试的任务ID添加到retryingTasks集合
    retryableTasks.forEach(task => retryingTasks.value.add(task.id));
    
    ElMessage.info(`正在重试 ${retryableTasks.length} 个任务，请稍候...`);
    
    // 并行执行所有重试操作
    const promises = retryableTasks.map(task => 
      downloadStore.retryTask(task.id)
        .then(() => {
          ElMessage.success(`任务 ${formatTaskId(task.id)} 重试成功`);
        })
        .catch((error) => {
          console.error(`重试任务 ${task.id} 失败:`, error);
          ElMessage.error(`任务 ${formatTaskId(task.id)} 重试失败`);
        })
        .finally(() => {
          retryingTasks.value.delete(task.id);
        })
    );
    
    // 等待所有操作完成
    await Promise.allSettled(promises);
    
    // 刷新任务列表
    await silentRefreshTasks();
    
    ElMessage.success(`批量操作完成，成功重试 ${retryableTasks.length} 个任务`);
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量重试失败:', error);
      ElMessage.error('批量重试失败');
    }
  } finally {
    batchRetrying.value = false;
    // 清理所有任务ID
    retryableTasks.forEach(task => retryingTasks.value.delete(task.id));
  }
};


// 工具函数
const formatTaskId = (id) => {
  return id.length > 36 ? `${id.slice(0, 8)}...${id.slice(-8)}` : id;
};

const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

const getStatusTagType = (status) => {
  const typeMap = {
    pending: '',
    processing: 'warning',
    completed: 'success',
    partial_completed: 'warning',
    failed: 'danger',
    cancelled: 'info'
  };
  return typeMap[status] || '';
};

const getResourceTypeTagType = (type) => {
  const typeMap = {
    hls: 'primary',
    mp4: 'success',
    image: 'warning'
  };
  return typeMap[type] || '';
};

const getProgressColor = (status) => {
  const colorMap = {
    pending: '#909399',
    processing: '#409EFF',
    completed: '#67C23A',
    partial_completed: '#E6A23C',
    failed: '#F56C6C',
    cancelled: '#909399'
  };
  return colorMap[status] || '#409EFF';
};

const canStart = (status) => {
  // 可以开始下载的状态：仅待处理
  return ['pending'].includes(status);
};

const canRetry = (status) => {
  // 可以重试的状态：失败、已取消、部分完成
  return ['failed', 'cancelled', 'partial_completed'].includes(status);
};

const canCancel = (status) => {
  return ['pending', 'processing'].includes(status);
};

const hasFailures = (status) => {
  return ['failed', 'partial_completed'].includes(status);
};
</script>

<style scoped>
.task-list-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.operation-card {
  margin-bottom: 16px;
}

.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  color: #1f2937;
}

/* 操作按钮区域样式 */
.operation-buttons {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-area {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.table-card {
  background: #fff;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 表格样式优化 */
:deep(.el-table) {
  .el-table__header {
    background-color: #fafbfc;
  }
  
  .el-table__row:hover {
    background-color: #f5f7fa;
    cursor: pointer;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-list-page {
    padding: 16px;
  }
  
  .operation-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .header-left {
    justify-content: space-between;
  }
  
  .button-group {
    justify-content: flex-start;
    gap: 8px;
  }
  
  .button-group .el-button {
    flex: 1;
    min-width: 120px;
  }
  
  .filter-area :deep(.el-form) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-area :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 8px;
  }

  /* 禁用状态的按钮样式 */
.button-disabled {
  opacity: 0.6;
  background-color: #f5f7fa !important;
  border-color: #dcdfe6 !important;
  color: #c0c4cc !important;
}

.button-disabled:hover {
  background-color: #f5f7fa !important;
  border-color: #dcdfe6 !important;
  color: #c0c4cc !important;
}

/* 确保按钮在禁用状态下仍然可见 */
.el-button:disabled {
  opacity: 0.6;
  background-color: #f5f7fa !important;
  border-color: #dcdfe6 !important;
  color: #c0c4cc !important;
}

}
</style>