<template>
  <div class="download-center">
    <el-card class="header-card">
      <div class="header-flex">
        <span class="page-title">下载失败记录</span>
        <div>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="重试中" value="retrying" />
            <el-option label="已放弃" value="abandoned" />
          </el-select>
          <el-button type="primary" @click="fetchFailures" style="margin-right: 24px;" data-testid="filter-btn">筛选</el-button>
        </div>
      </div>
    </el-card>
    <el-card class="table-card">
      <el-table
        :data="failures"
        v-loading="loading"
        border
        stripe
        style="width: 100%; max-height: 520px;"
        :empty-text="loading ? '加载中...' : (fetchError ? '加载失败，请刷新重试' : '暂无失败记录')"
        @row-click="(row) => goDetail(row.failure_id)"
      >
        <el-table-column prop="failure_id" label="失败记录ID" width="160">
          <template #default="{ row }">
            <el-tooltip :content="row.failure_id" placement="top">
              <span>{{ row.failure_id ? row.failure_id.slice(0, 16) + '...' : '' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="task_id" label="任务ID" width="160">
          <template #default="{ row }">
            <el-tooltip :content="row.task_id" placement="top">
              <span>{{ row.task_id ? row.task_id.slice(0, 16) + '...' : '' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="standard_name" label="文件名" width="200">
          <template #default="{ row }">
            <span class="ellipsis" :title="row.standard_name">{{ row.standard_name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="resource_type" label="资源类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="resourceTypeColor(row.resource_type)">{{ row.resource_type.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failure_type" label="失败类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="failureTypeColor(row.failure_type)">{{ failureTypeText(row.failure_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="error_message" label="错误信息" width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.error_message" placement="top">
              <span class="ellipsis">{{ row.error_message && row.error_message.length > 30 ? row.error_message.slice(0, 30) + '...' : row.error_message }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="retry_count" label="重试次数" width="90" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="dark">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="next_retry_time" label="下次重试时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.next_retry_time) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-space>
              <el-button size="small" @click.stop="goDetail(row.failure_id)" :data-testid="'detail-btn-' + row.failure_id">详情</el-button>
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
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatTime } from '@/utils/time'
import { ElMessage } from 'element-plus'
import { getAllFailures } from '@/api/download'

const router = useRouter()
const route = useRoute()

// 数据状态
const failures = ref([])
const loading = ref(false)
const fetchError = ref(false)
const total = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = 10
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const jumpPage = ref(currentPage.value)

// 筛选
const filterStatus = ref('')

// 监听页码变化
watch(currentPage, (val) => {
  jumpPage.value = val
})

// 分页函数
function goToPage() {
  if (
    jumpPage.value >= 1 &&
    jumpPage.value <= totalPages.value &&
    jumpPage.value !== currentPage.value
  ) {
    currentPage.value = jumpPage.value
    fetchFailures()
  } else if (jumpPage.value < 1 || jumpPage.value > totalPages.value) {
    ElMessage.warning('请输入有效页码')
    jumpPage.value = currentPage.value
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchFailures()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchFailures()
  }
}

// 获取失败记录列表
const fetchFailures = async () => {
  loading.value = true
  fetchError.value = false
  try {
    const params = {
      page: currentPage.value,
      size: pageSize,
      status: filterStatus.value || undefined,
    }
    const response = await getAllFailures(params)
    failures.value = response.data.data.items || []
    total.value = response.data.data.total || 0
  } catch (e) {
    console.error('获取失败记录列表失败:', e)
    ElMessage.error('数据格式错误或请求失败')
    failures.value = []
    total.value = 0
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

// 页面初始化
onMounted(() => {
  if (route.query.page) {
    const page = parseInt(route.query.page, 10)
    if (!isNaN(page) && page > 0) {
      currentPage.value = page
    }
  }
  fetchFailures()
})

// 监听页码变化
watch(currentPage, () => {
  fetchFailures()
})

// 导航函数
const goDetail = (id) => {
  if (!id || id === 'undefined') {
    ElMessage.error('失败记录ID无效，无法跳转到详情页面')
    return
  }
  router.push(`/download-center/failures/${id}`)
}

// 状态相关函数
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

.custom-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
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
</style>