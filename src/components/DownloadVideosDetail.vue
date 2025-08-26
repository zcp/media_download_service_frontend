<template>
  <div class="videos-page">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-button @click="goBack" :icon="ArrowLeft" type="text">返回</el-button>
          <h2 class="page-title">{{ pageTitle }}</h2>
          <el-tag type="info" size="large">
            共 {{ downloadStore.videosTotal }} 个视频
          </el-tag>
        </div>
        <div class="header-right">
          <el-button @click="refreshVideos" :loading="loading">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 视频列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="downloadStore.videos"
        :loading="loading"
        border
        stripe
        height="600"
        v-loading="loading"
      >
        <el-table-column prop="id" label="视频ID" width="280" show-overflow-tooltip />
        
        <el-table-column prop="video_id" label="文件标识" width="200" show-overflow-tooltip />
        
        <el-table-column prop="liveroom_id" label="直播间ID" width="120" />
        
        <el-table-column prop="resource_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getResourceTypeTagType(row.resource_type)" size="small">
              {{ row.resource_type.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="file_size" label="文件大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.file_size) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="duration" label="时长" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="resolution" label="分辨率" width="120" />
        
        <el-table-column prop="format" label="格式" width="80" />
        
        <el-table-column prop="storage_path" label="存储路径" width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="path-item">
              <span>{{ row.storage_path }}</span>
              <el-button 
                size="small" 
                text 
                @click="copyPath(row.storage_path)"
                :icon="CopyDocument"
              />
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getVideoStatusTagType(row.status)" size="small">
              {{ getVideoStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="download_end_time" label="完成时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.download_end_time, 'MM-DD HH:mm') }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              @click="showVideoDetail(row)"
            >
              详情
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
          :total="downloadStore.videosTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 视频详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="视频详情"
      width="600px"
      @close="selectedVideo = null"
    >
      <div v-if="selectedVideo" class="video-detail">
        <div class="detail-grid">
          <div class="detail-item">
            <label>视频ID:</label>
            <span>{{ selectedVideo.video_id }}</span>
          </div>
          <div class="detail-item">
            <label>直播间标题:</label>
            <span>{{ selectedVideo.liveroom_title || '-' }}</span>
          </div>
          <div class="detail-item">
            <label>资源URL:</label>
            <el-link :href="selectedVideo.resource_url" target="_blank" type="primary">
              查看原始资源
            </el-link>
          </div>
          <div class="detail-item">
            <label>存储路径:</label>
            <div class="path-detail">
              <span>{{ selectedVideo.storage_path }}</span>
              <el-button size="small" @click="copyPath(selectedVideo.storage_path)">
                复制路径
              </el-button>
            </div>
          </div>
          <div class="detail-item" v-if="selectedVideo.cover_path">
            <label>封面路径:</label>
            <span>{{ selectedVideo.cover_path }}</span>
          </div>
          <div class="detail-item">
            <label>下载开始时间:</label>
            <span>{{ formatDateTime(selectedVideo.download_start_time) }}</span>
          </div>
          <div class="detail-item">
            <label>下载结束时间:</label>
            <span>{{ formatDateTime(selectedVideo.download_end_time) }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDownloadStore } from '@/stores/download';
import { formatDateTime, formatFileSize, formatDuration } from '@/utils/time';
import { ArrowLeft, CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const downloadStore = useDownloadStore();

const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const dialogVisible = ref(false);
const selectedVideo = ref(null);

const taskId = computed(() => route.params.taskId);

// 页面标题计算属性
const pageTitle = computed(() => {
  return taskId.value ? `已下载视频列表（任务 ${taskId.value}）` : '已下载视频列表';
});

// 是否为全局视频页面
const isGlobalVideos = computed(() => !taskId.value);

onMounted(async () => {
  await fetchVideos();
});

const fetchVideos = async () => {
  loading.value = true;
  try {
    console.log('开始获取视频列表...');
    console.log('是否为全局视频页面:', isGlobalVideos.value);
    console.log('任务ID:', taskId.value);
    
    // 如果是全局视频页面，不传递taskId
    const taskIdToUse = isGlobalVideos.value ? null : taskId.value;
    console.log('使用的任务ID:', taskIdToUse);
    
    const params = {
      page: currentPage.value,
      size: pageSize.value
    };
    console.log('查询参数:', params);
    
    await downloadStore.fetchVideos(taskIdToUse, params);
    console.log('视频列表获取成功');
  } catch (error) {
    console.error('获取视频列表失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      response: error.response,
      status: error.status
    });
    
    // 根据错误类型显示不同的提示
    if (error.message && error.message.includes('500')) {
      ElMessage.error('服务器内部错误，请稍后重试或联系管理员');
    } else if (error.message && error.message.includes('404')) {
      ElMessage.error('接口不存在，请联系管理员');
    } else {
      ElMessage.error('获取视频列表失败，请重试');
    }
  } finally {
    loading.value = false;
  }
};

const refreshVideos = async () => {
  await fetchVideos();
  ElMessage.success('刷新成功');
};

const handleSizeChange = async (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  await fetchVideos();
};

const handleCurrentChange = async (newPage) => {
  currentPage.value = newPage;
  await fetchVideos();
};

const showVideoDetail = (video) => {
  selectedVideo.value = video;
  dialogVisible.value = true;
};

const copyPath = async (path) => {
  try {
    await navigator.clipboard.writeText(path);
    ElMessage.success('路径已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

const goBack = () => router.back();

// 工具函数
const getResourceTypeTagType = (type) => {
  const map = {
    hls: 'primary',
    mp4: 'success',
    image: 'warning'
  };
  return map[type] || '';
};

const getVideoStatusText = (status) => {
  const map = {
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败'
  };
  return map[status] || status;
};

const getVideoStatusTagType = (status) => {
  const map = {
    completed: 'success',
    partial_completed: 'warning',
    failed: 'danger'
  };
  return map[status] || '';
};
</script>

<style scoped>
.videos-page {
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

.path-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.video-detail {
  padding: 16px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-item label {
  min-width: 120px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
}

.path-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

@media (max-width: 768px) {
  .videos-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .detail-item label {
    min-width: auto;
  }
}
</style>