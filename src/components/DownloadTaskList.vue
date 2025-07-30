<template>
  <div class="download-center">
    <el-card class="header-card">
      <div class="header-flex">
        <span class="page-title">媒体下载任务管理</span>
        <div>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="进行中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="部分完成" value="partial_completed" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-button type="primary" @click="fetchTasks" style="margin-right: 24px;" data-testid="filter-btn">筛选</el-button>
          <el-button type="primary" @click="goCreate" data-testid="create-task-btn">创建新任务</el-button>
          <el-button type="success" @click="showImport = true" style="margin-left: 8px;" data-testid="import-tasks-btn">批量导入</el-button>
        </div>
      </div>
    </el-card>
    <el-card class="table-card">
      <el-table
        :data="store.tasks"
        v-loading="store.loading"
        border
        stripe
        :height="tableHeight"
        :empty-text="store.loading ? '加载中...' : (fetchError ? '加载失败，请刷新重试' : '暂无下载任务，快去创建吧！')"
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
              <el-button size="small" v-if="row.status==='pending'" type="success" @click.stop="start(row.id)" :data-testid="'start-btn-' + row.id">下载</el-button>
              <el-button size="small" v-if="row.status==='processing'" @click.stop="pause(row.id)" :data-testid="'pause-btn-' + row.id">暂停</el-button>
              <el-button size="small" v-if="row.status==='failed'" type="warning" @click.stop="retry(row.id)" :data-testid="'retry-btn-' + row.id">重试</el-button>
              <el-button size="small" v-if="['pending','processing'].includes(row.status)" type="danger" @click.stop="cancel(row.id)" :data-testid="'delete-btn-' + row.id">删除</el-button>
              <el-button size="small" v-if="['failed','partial_completed'].includes(row.status)" @click.stop="goFailures(row.id)" :data-testid="'failures-btn-' + row.id">失败记录</el-button>
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
    <el-dialog v-model="showImport" title="批量导入下载任务" width="400px">
      <input type="file" @change="handleFileChange" accept=".csv" />
      <div v-if="importData.length" style="margin: 16px 0;">
        <el-table :data="importData.slice(0, 5)" size="small" border>
          <el-table-column prop="直播间ID" label="直播间ID" />
          <el-table-column prop="标题" label="标题" />
          <el-table-column prop="播放url" label="播放url" />
        </el-table>
        <div style="color: #888; font-size: 12px;">仅展示前5条，实际将导入{{importData.length}}条</div>
      </div>
      <template #footer>
        <el-button @click="showImport = false">取消</el-button>
        <el-button type="primary" :disabled="!importData.length" @click="importTasks" data-testid="import-confirm-btn">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useDownloadStore } from '@/store/download'
import { onMounted, watch, ref, onUnmounted , computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatTime } from '@/utils/time'
import Papa from 'papaparse'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchDownloadTasks } from '@/api/download'
import { sanitizeForCsv, validateUrl, generateVideoId } from '@/utils/security'

const store = useDownloadStore()
const router = useRouter()
const route = useRoute()

const currentPage = ref(1);
const pageSize = 10;
const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)));
const jumpPage = ref(currentPage.value);

// 动态表格高度
const tableHeight = ref(400);

// 计算表格高度的函数
const calculateTableHeight = () => {
  nextTick(() => {
    // 获取视口高度
    const viewportHeight = window.innerHeight;
    
    // 预留空间：
    // - 顶部导航栏: ~60px
    // - 页面标题卡片: ~80px  
    // - 分页组件: ~60px
    // - 页面边距: ~40px
    // - 其他缓冲: ~40px
    const reservedHeight = 280;
    
    // 计算可用高度，最小400px，最大800px
    const availableHeight = Math.max(400, Math.min(800, viewportHeight - reservedHeight));
    
    tableHeight.value = availableHeight;
  });
};

// 窗口大小变化监听
const handleResize = () => {
  calculateTableHeight();
};

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
    fetchTasks();
  } else if (jumpPage.value < 1 || jumpPage.value > totalPages.value) {
    ElMessage.warning('请输入有效页码');
    jumpPage.value = currentPage.value;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchTasks();
  }
}
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchTasks();
  }
}

// 筛选功能现在将通过这些 ref 绑定
const filterStatus = ref('');

// 精细化loading状态
const processingIds = ref(new Set())
const deletingIds = ref(new Set())
const retryingIds = ref(new Set())
const fetchController = ref(null)

// 新增：用于跟踪获取列表是否失败
const fetchError = ref(false);

const fetchTasks = async () => {
  store.loading = true;
  fetchError.value = false; // 重置错误状态
  try {
    const params = {
      page: currentPage.value,
      size: pageSize,
      // 添加筛选参数
      status: filterStatus.value || undefined,
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

onMounted(() => {
  if (route.query.page) {
    const page = parseInt(route.query.page, 10);
    if (!isNaN(page) && page > 0) {
      currentPage.value = page;
    }
  }
  fetchTasks();
  
  // 初始化表格高度
  calculateTableHeight();
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
});

watch(currentPage, () => {
  fetchTasks()
})

onUnmounted(() => {
  if (fetchController.value) fetchController.value.abort();
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
})

const goCreate = () => router.push('/download-center/tasks/create')
const goDetail = (id) => {
  router.push({
    path: `/download-center/tasks/${id}`,
    query: { fromPage: currentPage.value }
  })
}
const goFailures = (id) => router.push(`/download-center/tasks/${id}/failures`)
// const goVideos = (id) => router.push(`/download-center/tasks/${id}/videos`)

const start = async (id) => {
  processingIds.value.add(id)
  try {
    await store.startDownloadTask(id)
    await fetchTasks()
    ElMessage.success('任务已开始下载')
  } catch {
    ElMessage.error('启动下载失败，请稍后重试')
  } finally {
    processingIds.value.delete(id)
  }
}
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
const cancel = async (id) => {
  try {
    // 添加确认对话框
    await ElMessageBox.confirm('确定要删除该下载任务吗？删除后无法恢复', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    deletingIds.value.add(id)
    try {
      await store.deleteDownloadTask(id)
      await fetchTasks()
      ElMessage.success('任务已删除')
    } catch {
      ElMessage.error('删除失败，请稍后重试')
    } finally {
      deletingIds.value.delete(id)
    }
  } catch {
    // 用户取消删除，不执行任何操作
    console.log('用户取消了删除操作');
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

const showImport = ref(false)
const importData = ref([])

function getResourceType(url) {
  if (!url) return ''
  if (url.includes('m3u8')) return 'hls'
  if (url.includes('mp4')) return 'mp4'
  return ''
}

// 健壮的文件校验
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) {
    importData.value = []
    return
  }

  // 1. 优先校验 MIME 类型
  const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';

  const isMimeAllowed = allowedMimeTypes.includes(file.type);
  const isExtensionAllowed = fileExtension === 'csv';

  if (!isMimeAllowed && !isExtensionAllowed) {
    ElMessage.error('文件类型不正确，请上传 CSV 文件。');
    importData.value = []
    e.target.value = '' // 重置文件输入
    return;
  }

  // 如果 MIME 是通用的，则必须要求扩展名是 .csv
  if (file.type === 'text/plain' && !isExtensionAllowed) {
    ElMessage.error('文件类型不明确，请确保文件扩展名为 .csv');
    importData.value = []
    e.target.value = '' // 重置文件输入
    return;
  }

  // 校验大小
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 5MB')
    importData.value = []
    e.target.value = '' // 重置文件输入
    return
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length) {
        ElMessage.error('CSV 文件格式有误，无法解析')
        return
      }
      const requiredHeaders = ['直播间ID', '标题', '播放url']
      const actualHeaders = results.meta.fields
      if (!requiredHeaders.every(h => actualHeaders.includes(h))) {
        ElMessage.error(`CSV 文件必须包含以下列: ${requiredHeaders.join(', ')}`)
        importData.value = [] // 解析失败,清空数据
        return
      }

      // 过滤掉 '播放url' 为空的行，并对有效数据进行初步处理
      const validData = results.data
        .map(row => ({...row, '标题': sanitizeForCsv(row['标题'])})) // 清理标题
        .filter(row => row['播放url'])

      if (validData.length === 0) {
        ElMessage.warning('文件中没有找到有效的任务数据')
        importData.value = []
        return
      }
      importData.value = validData
    },
    error: () => {
       ElMessage.error('解析CSV文件时发生错误')
       importData.value = []
    }
  })
}

const importTasks = async () => {
  const tasks = []
  const invalidRows = []

  for (const [index, row] of importData.value.entries()) {
    const resource_url = row['播放url']

    // 1. 验证URL
    const urlValidation = validateUrl(resource_url)
    if (!urlValidation.isValid) {
      invalidRows.push(`第 ${index + 1} 行: ${urlValidation.reason}`);
      continue; // 跳过无效行
    }

    // 2. 验证资源类型
    const resource_type = getResourceType(resource_url)
    if (!resource_type) {
      invalidRows.push(`第 ${index + 1} 行: 不支持的资源类型 (仅支持 .m3u8 和 .mp4)`);
      continue; // 跳过无效行
    }

    // 3. 数据清理和准备
    // (标题已在 handleFileChange 中使用 sanitizeForCsv 清理过)
    const liveroom_id = String(row['直播间ID']).padStart(10, '0');
    const video_id = generateVideoId(liveroom_id)

    tasks.push({
      video_id,
      liveroom_id,
      liveroom_title: row['标题'], // 使用已清理的标题
      liveroom_url: row['直播间url'],
      resource_url,
      resource_type,
    })
  }

  if (invalidRows.length > 0) {
    // 构建一个更可读的错误消息
    const errorMessage = `导入过程中发现 ${invalidRows.length} 个问题：<br/>- ${invalidRows.slice(0, 5).join('<br/>- ')}${invalidRows.length > 5 ? '<br/>...等' : ''}`;
    ElMessageBox.alert(errorMessage, '导入数据校验失败', {
        dangerouslyUseHTMLString: true,
        type: 'error'
    });
  }

  if (tasks.length > 0) {
    try {
      await store.createTask(tasks)
      const successMessage = `成功导入 ${tasks.length} 个任务。` + (invalidRows.length > 0 ? `另有 ${invalidRows.length} 个任务因数据无效被忽略。` : '');
      ElMessage.success(successMessage)
    } catch {
      ElMessage.error('批量导入失败，请稍后重试')
    }
  } else if (invalidRows.length === 0) {
    ElMessage.warning('没有可导入的任务')
  }

  showImport.value = false
  importData.value = []
  await fetchTasks()
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

/* 表格滚动优化 */
.el-table {
  border-radius: 10px 10px 0 0;
}

.el-table .el-table__body-wrapper {
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
