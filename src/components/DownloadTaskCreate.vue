<template>
  <div class="task-create-page">
    <el-card class="create-card" shadow="never">
      <template #header>
        <div class="card-header">
          <h2 class="page-title">创建下载任务</h2>
          <el-button @click="goBack" :icon="ArrowLeft">返回列表</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        size="large"
        @submit.prevent="handleSubmit"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>

          <el-form-item label="资源URL" prop="resource_url" required>
            <el-input
              v-model="form.resource_url"
              type="textarea"
              :rows="3"
              placeholder="请输入资源URL（支持HLS、MP4、图片等格式）"
              show-word-limit
              maxlength="2000"
            />
            <div class="form-tip">
              支持的格式：HLS (.m3u8)、MP4 (.mp4)、图片 (.jpg, .png, .gif)
            </div>
          </el-form-item>

          <el-form-item label="资源类型" prop="resource_type" required>
            <el-select v-model="form.resource_type" placeholder="选择资源类型">
              <el-option label="HLS" value="hls" />
              <el-option label="MP4" value="mp4" />
              <el-option label="图片" value="image" />
            </el-select>
          </el-form-item>

          <!-- 隐藏的video_id字段，用于向后端传递 -->
          <el-form-item prop="video_id" style="display: none;">
            <el-input v-model="form.video_id" />
          </el-form-item>

          <el-form-item label="直播间ID" prop="liveroom_id" required>
            <el-input
              v-model="form.liveroom_id"
              placeholder="请输入直播间ID"
              @input="handleLiveroomIdChange"
            />
          </el-form-item>
        </div>

        <!-- 直播间信息 -->
        <div class="form-section">
          <h3 class="section-title">直播间信息</h3>

          <el-form-item label="直播间标题" prop="liveroom_title" required>
            <el-input
              v-model="form.liveroom_title"
              placeholder="请输入直播间标题"
              show-word-limit
              maxlength="200"
            />
          </el-form-item>

          <el-form-item label="直播间URL" prop="liveroom_url" required>
            <el-input
              v-model="form.liveroom_url"
              placeholder="请输入直播间URL"
              show-word-limit
              maxlength="500"
            />
          </el-form-item>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button size="large" @click="handleReset">重置</el-button>
          <el-button
            type="primary"
            size="large"
            @click="handleSubmit"
            :loading="submitting"
          >
            创建任务
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDownloadStore } from '@/stores/download';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';

const router = useRouter();
const downloadStore = useDownloadStore();

const formRef = ref();
const submitting = ref(false);

// 表单数据
const form = reactive({
  resource_url: '',
  resource_type: '',
  video_id: '',
  liveroom_id: '',
  liveroom_title: '',
  liveroom_url: ''
});

// 验证规则
const rules = {
  resource_url: [
    { required: true, message: '请输入资源URL', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的URL格式',
      trigger: 'blur'
    }
  ],
  resource_type: [
    { required: true, message: '请选择资源类型', trigger: 'change' }
  ],
  video_id: [
    { required: false, message: '视频ID不能为空', trigger: 'blur' }
  ],
  liveroom_id: [
    { required: true, message: '请输入直播间ID', trigger: 'blur' }
  ],
  liveroom_title: [
    { required: true, message: '请输入直播间标题', trigger: 'blur' }
  ],
  liveroom_url: [
    { required: true, message: '请输入直播间URL', trigger: 'blur' },
    {
      pattern: /^(https?:\/\/.+)?$/,
      message: '请输入有效的URL格式',
      trigger: 'blur'
    }
  ]
};

// 生成视频ID
const generateVideoId = () => {
  if (!form.liveroom_id) {
    ElMessage.warning('请先输入直播间ID');
    return;
  }

  const uuid = uuidv4();
  form.video_id = uuid; // 只使用纯UUID，不拼接liveroom_id
  ElMessage.success('视频ID生成成功');
};

// 直播间ID变化处理
const handleLiveroomIdChange = () => {
  // 自动更新video_id，确保每次都有新的UUID
  form.video_id = uuidv4();
};

// 页面加载时自动生成视频ID（如果有直播间ID）
const autoGenerateVideoId = () => {
  if (form.liveroom_id && !form.video_id) {
    generateVideoId();
  }
};

// 页面挂载时执行
onMounted(() => {
    // 自动生成video_id，确保表单提交时有值
    if (!form.video_id) {
    form.video_id = uuidv4();
  }
  // 如果有直播间ID，自动生成视频ID
  if (form.liveroom_id) {
    autoGenerateVideoId();
  }
});

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    submitting.value = true;

    const taskData = { ...form };
    
    // 添加调试信息
    console.log('提交的表单数据:', taskData);
    
    // 确保所有字段都有值，避免发送 undefined
    Object.keys(taskData).forEach(key => {
      if (taskData[key] === undefined || taskData[key] === null) {
        taskData[key] = '';
      }
    });
    
    console.log('清理后的表单数据:', taskData);

    await downloadStore.createTask(taskData);

    ElMessage.success('任务创建成功');

    // 跳转到任务列表
    router.push('/download-center/tasks');
  } catch (error) {
    if (error.errors) {
      // 表单验证错误
      console.log('表单验证失败:', error);
    } else {
      // API调用错误
      console.error('创建任务失败:', error);
      ElMessage.error('创建任务失败，请重试');
    }
  } finally {
    submitting.value = false;
  }
};

// 重置表单
const handleReset = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }

  Object.keys(form).forEach(key => {
    form[key] = '';
  });
};

// 返回列表
const goBack = () => {
  router.back();
};
</script>

<style scoped>
.task-create-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.create-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.form-section {
  margin-bottom: 32px;
  padding: 20px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.form-actions {
  margin-top: 32px;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 视频ID输入框样式 */
.video-id-input {
  background-color: #f5f7fa;
}

.video-id-input :deep(.el-input__inner) {
  background-color: #f5f7fa;
  color: #606266;
  cursor: not-allowed;
}

.video-id-input :deep(.el-input__inner:disabled) {
  background-color: #f5f7fa;
  color: #606266;
  border-color: #dcdfe6;
}

/* 确保所有表单项对齐 */
.el-form-item {
  margin-bottom: 24px;
}

.el-form-item__label {
  font-weight: 500;
  color: #374151;
}

/* 统一输入框样式 */
.el-input,
.el-select {
  width: 100%;
}

/* 响应式标签宽度 */
@media (max-width: 768px) {
  .el-form {
    label-width: 100px !important;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-create-page {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .form-section {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
