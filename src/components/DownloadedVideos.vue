<template>
  <div class="download-center">
    <el-card class="header-card">
      <div class="header-flex">
        <span class="page-title">已下载视频列表</span>
      </div>
    </el-card>
    <el-card class="table-card">
      <el-tabs v-model="activeTabName">
        <el-tab-pane label="已完成" name="completed"></el-tab-pane>
        <el-tab-pane label="部分完成" name="partial_completed"></el-tab-pane>
      </el-tabs>
      <el-table
        :data="store.tasks"
        v-loading="store.loading"
        border
        stripe
        style="width: 100%; max-height: 520px;"
        :empty-text="store.loading ? '加载中...' : (fetchError ? '加载失败，请刷新重试' : '暂无相关任务')"
        @row-click="(row) => goDetail(row.id)"
      >
        <el-table-column prop="id" label="任务ID" width="160">
          <template #default="{ row }">
            <el-tooltip :content="row.id" placement="top">
              <span>{{ row.id ? row.id.slice(0, 16) + '...' : '' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="video_id" label="视频ID" width="145">
          <template #default="{ row }">
            <span>{{ row.video_id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="liveroom_id" label="直播间ID" width="120" />
        <el-table-column prop="liveroom_title" label="直播间标题" width="200">
          <template #default="{ row }">
            <span class="ellipsis" :title="row.liveroom_title">{{ row.liveroom_title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="resource_type" label="类型" width="60" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="dark">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.progress * 100)" :status="progressStatus(row.status)" stroke-width="16" />
          </template>
        </el-table-column>
        <el-table-column prop="retry_count" label="重试次数" width="90" />
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-space>
              <el-button size="small" @click.stop="goDetail(row.id)" :data-testid="'detail-btn-' + row.id">详情</el-button>
              <el-button size="small" v-if="row.status === 'partial_completed'" @click.stop="goFailures(row.id)">失败记录</el-button>
              <el-button size="small" v-if="row.status === 'partial_completed'" type="warning" @click.stop="retry(row.id)">重试</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <div class="custom-pagination">
        <button
          class="page-btn"
          @click="prevPage"
          :disabled="currentPage === 1"
          aria-label="上一页"
        >
          ‹
        </button>
        <span class="current-page">{{ currentPage }}</span>
        <button
          class="page-btn"
          @click="nextPage"
          :disabled="currentPage === totalPages"
          aria-label="下一页"
        >
          ›
        </button>
        <input
          class="page-input"
          type="number"
          v-model.number="jumpPage"
          :min="1"
          :max="totalPages"
          @keyup.enter="goToPage"
        />
        <span class="total-pages">/ {{ totalPages }}</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { useDownloadStore } from '@/store/download'
import { onMounted, watch, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatTime } from '@/utils/time'
import { ElMessage } from 'element-plus'
import { fetchDownloadTasks } from '@/api/download'

const store = useDownloadStore()
const router = useRouter()

const activeTabName = ref('completed')

const currentPage = ref(1);
const pageSize = 10;
const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)));
const jumpPage = ref(currentPage.value);

watch(currentPage, (val) => {
  jumpPage.value = val;
});

function goToPage() {
  if (
    jumpPage.value >= 1 &&
    jumpPage.value <= totalPages.value &&
    jumpPage.value !== currentPage.value
  ) {
    currentPage.value = jumpPage.value;
  } else if (jumpPage.value < 1 || jumpPage.value > totalPages.value) {
    ElMessage.warning('请输入有效页码');
    jumpPage.value = currentPage.value;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

// 精细化loading状态
const retryingIds = ref(new Set())

// 新增：用于跟踪获取列表是否失败
const fetchError = ref(false);

const fetchTasks = async () => {
  store.loading = true;
  fetchError.value = false; // 重置错误状态
  try {
    const params = {
      page: currentPage.value,
      size: pageSize,
      status: activeTabName.value,
    };
    const response = await fetchDownloadTasks(params);
    store.tasks = response.items;
    store.total = response.total;
  } catch (e) {
    console.error('获取任务列表失败:', e);
    ElMessage.error('数据格式错误或请求失败');
    store.tasks = [];
    store.total = 0;
    fetchError.value = true; // 标记获取失败
  } finally {
    store.loading = false; // 无论成功失败都关闭 loading
  }
};

onMounted(fetchTasks)

watch(activeTabName, () => {
    currentPage.value = 1;
    fetchTasks();
});

watch(currentPage, (newPage, oldPage) => {
  if(newPage !== oldPage) fetchTasks()
})

const goDetail = (id) => router.push(`/download-center/${id}/videos/`)
const goFailures = (id) => router.push(`/download-center/tasks/${id}/failures`)

const retry = async (id) => {
  retryingIds.value.add(id)
  try {
    await store.retryDownloadTask(id)
    await fetchTasks()
    ElMessage.success('任务重试成功')
  } catch {
    ElMessage.error('重试失败，请稍后重试')
  } finally {
    retryingIds.value.delete(id)
  }
}

const statusType = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'info'
  if (status === 'partial_completed') return 'warning'
  return undefined // For 'pending' and other statuses, use default ElTag style
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
.download-center {
  padding: 24px 32px 0 32px;
  background: #f6f8fa;
}
.header-card {
  border-radius: 8px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px #0000000d;
}
.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #222;
}
.table-card {
  border-radius: 10px;
  box-shadow: 0 2px 12px #0000000d;
  margin-bottom: 24px;
  padding-bottom: 0;
  background: #fff;
}

.el-tabs {
  margin: 0 20px;
}

.el-table {
  border-radius: 10px 10px 0 0;
}

.custom-pagination {
  display: flex;
  align-items: center;
  justify-content: center; /* right-align -> center */
  gap: 8px;
  margin-top: 24px;
  font-size: 14px;
  padding: 0 20px;
}

.page-btn {
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 4px;
  color: #606266;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.page-btn:hover:not(:disabled) {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

.page-btn:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  background-color: #f5f7fa;
}

.current-page {
  font-weight: bold;
  font-size: 16px;
  color: #303133;
  margin: 0 4px;
  min-width: 24px;
  text-align: center;
}

.page-input {
  width: 50px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  outline: none;
  margin-left: 12px;
  transition: border-color 0.2s;
}

.page-input:focus {
  border-color: #409eff;
}

/* Hide the number input arrows */
.page-input::-webkit-outer-spin-button,
.page-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.page-input[type=number] {
  -moz-appearance: textfield;
}

.total-pages {
  color: #606266;
  margin-left: 2px;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 180px;
}
.current-page-indicator {
  margin-left: 12px;
  color: #888;
  font-size: 15px;
}
/* 只保留当前页、上一页、下一页 */
.el-pagination .el-pager li:not(.is-active):not(.el-pagination__pager-prev):not(.el-pagination__pager-next) {
  display: none !important;
}
/* 隐藏省略号 */
.el-pagination .el-pager li.is-ellipsis {
  display: none !important;
}
</style>
