
<template>
  <el-card shadow="never">
    <template #header>
      <span style="font-size: 20px; font-weight: bold;">失败记录</span>
      <el-button
        type="primary"
        size="small"
        style="float: right;"
        :disabled="loading || !failures.length"
        @click="retryAll"
      >重试全部失败片段</el-button>
    </template>
    <el-table :data="failures" v-loading="loading">
      <el-table-column prop="id" label="失败ID" width="180" />
      <el-table-column prop="resource_url" label="资源URL" width="200" />
      <el-table-column prop="expected_path" label="期望路径" width="180" />
      <el-table-column prop="resource_type" label="类型" width="80" />
      <el-table-column prop="failure_type" label="失败类型" width="100" />
      <el-table-column prop="error_message" label="错误信息" width="200">
        <template #default="{ row }">
          <el-tooltip :content="row.error_message" placement="top">
            <span>{{ row.error_message && row.error_message.length > 20 ? row.error_message.slice(0, 20) + '...' : row.error_message }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="retry_count" label="重试次数" width="80" />
      <el-table-column prop="next_retry_time" label="下次重试" width="160">
        <template #default="{ row }">
          {{ formatTime(row.next_retry_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" type="danger" :disabled="loading" @click="abandon(row.id)">放弃</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!failures.length && !loading" description="暂无失败记录" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTaskFailures, retryDownloadTask, abandonFailure } from '@/api/download'
import { formatTime } from '@/utils/time'

const route = useRoute()
const taskId = route.params.taskId
const failures = ref([])
const loading = ref(false)

const fetchFailures = async () => {
  loading.value = true
  try {
    const res = await getTaskFailures(taskId, { skip: 0, limit: 100 })
    failures.value = res.data.data.items
  } catch (e) {
    ElMessage.error(e?.message || '获取失败记录失败')
  } finally {
    loading.value = false
  }
}

// 重试全部失败片段
const retryAll = async () => {
  if (!taskId) {
    ElMessage.info('请先选择具体的下载任务后再重试全部失败片段')
    return
  }
  loading.value = true
  try {
    const res = await retryDownloadTask(taskId)
    if (res.data.code === 200) {
      ElMessage.success('重试全部失败片段成功')
    } else {
      ElMessage.error(res.data.message || '重试全部失败片段失败')
    }
    await fetchFailures()
  } finally {
    loading.value = false
  }
}

// 放弃单条失败记录
const abandon = async (failureId) => {
  if (!taskId) {
    ElMessage.info('请先选择具体的下载任务后再放弃失败片段')
    return
  }
  loading.value = true
  try {
    const res = await abandonFailure(taskId, failureId)
    if (res.data.code === 200) {
      ElMessage.success('放弃失败记录成功')
    } else {
      ElMessage.error(res.data.message || '放弃失败')
    }
    await fetchFailures()
  } finally {
    loading.value = false
  }
}

onMounted(fetchFailures)
</script>
