<template>
  <div class="create-task-container">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <span data-testid="card-header-title">创建下载任务</span>
        </div>
      </template>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="资源URL" prop="resource_url">
          <el-input v-model="form.resource_url" placeholder="粘贴链接后将自动识别类型" clearable />
        </el-form-item>
        <el-form-item label="资源类型" prop="resource_type">
          <el-select v-model="form.resource_type" placeholder="自动识别或手动选择">
            <el-option label="HLS" value="hls" />
            <el-option label="MP4" value="mp4" />
          </el-select>
        </el-form-item>
        <el-form-item label="直播间ID" prop="liveroom_id">
          <el-input v-model="form.liveroom_id" placeholder="输入后将自动生成视频ID" clearable/>
        </el-form-item>
        <el-form-item label="视频ID" prop="video_id">
          <el-input v-model="form.video_id" placeholder="由直播间ID自动生成" readonly />
        </el-form-item>
        <el-form-item label="直播间标题" prop="liveroom_title">
          <el-input v-model="form.liveroom_title" placeholder="（选填）任务的别名" clearable/>
        </el-form-item>
        <el-form-item label="直播间URL" prop="liveroom_url">
          <el-input v-model="form.liveroom_url" placeholder="（选填）原始页面链接" clearable/>
        </el-form-item>
        <el-form-item class="action-buttons">
          <el-button @click="onCancel">取消</el-button>
          <el-button type="primary" @click="onSubmit">立即创建</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose } from 'vue'
import { useRouter } from 'vue-router'
import { useDownloadStore } from '@/store/download'
import { ElMessage } from 'element-plus'
import { validateUrl, generateVideoId, sanitizeForCsv } from '@/utils/security'
import { isValidVideoId } from '@/utils/validate'

const router = useRouter()
const store = useDownloadStore()
const formRef = ref()
const form = ref({
  resource_url: '',
  resource_type: '',
  video_id: '',
  liveroom_id: '',
  liveroom_title: '',
  liveroom_url: ''
})

// 监听资源URL变化，自动识别类型
watch(() => form.value.resource_url, (newUrl) => {
  if (newUrl) {
    if (newUrl.toLowerCase().includes('.m3u8')) {
      form.value.resource_type = 'hls';
    } else if (newUrl.toLowerCase().includes('.mp4')) {
      form.value.resource_type = 'mp4';
    }
  }
});


// 监听 liveroom_id 变化，自动生成 video_id
watch(() => form.value.liveroom_id, (newVal) => {
  // 允许用户输入8-10位的ID，生成时总是基于补全的10位ID
  if (newVal && /^\d{8,10}$/.test(newVal)) {
    const paddedLiveroomId = String(newVal).padStart(10, '0')
    form.value.video_id = generateVideoId(paddedLiveroomId);
  } else {
    form.value.video_id = ''
  }
})

// 自定义安全URL验证器
const secureUrlValidator = (rule, value, callback) => {
  const result = validateUrl(value)
  if (result.isValid) {
    callback()
  } else {
    callback(new Error(result.reason))
  }
}

const rules = {
  resource_url: [
    { required: true, message: '资源URL是必填项', trigger: 'blur' },
    { validator: secureUrlValidator, trigger: 'blur' }
  ],
  resource_type: [{ required: true, message: '请选择一个资源类型', trigger: 'change' }],
  video_id: [
    { required: true, message: '视频ID是必填项，由直播间ID自动生成', trigger: 'blur' },
    { validator: (rule, value, callback) => isValidVideoId(value) ? callback() : callback('视频ID格式不正确，请检查直播间ID'), trigger: 'blur' }
  ],
  liveroom_id: [
    { required: true, message: '直播间ID是必填项', trigger: 'blur' },
    { pattern: /^\d{8,10}$/, message: '直播间ID必须为8-10位数字', trigger: 'blur' }
  ]
}

const onSubmit = async () => {
  if (!formRef.value) return

  try {
    // 1. 触发表单验证，如果失败会抛出错误，被 catch 捕获
    await formRef.value.validate()

    // 2. 如果验证通过，准备并发送数据
    const payload = { ...form.value }

    // 对标题进行CSV注入清理
    if (payload.liveroom_title) {
      payload.liveroom_title = sanitizeForCsv(payload.liveroom_title)
    } else {
      delete payload.liveroom_title
    }
    if (payload.liveroom_url) {
        payload.liveroom_url = payload.liveroom_url.trim()
    } else {
        delete payload.liveroom_url
    }
    payload.liveroom_id = String(payload.liveroom_id).padStart(10, '0')
    
    // 不再重新生成 video_id，直接使用表单中已有的、由watch生成的值
    // payload.video_id = generateVideoId(payload.liveroom_id)

    // 3. 调用 store action，如果API调用失败，也会被 catch 捕获
    await store.createTask(payload)
    ElMessage.success('任务创建成功！')
    router.push('/download-center/tasks')
    
  } catch (errorOrValidation) {
    // 4. 捕获验证错误或API调用错误
    // El-Form 的验证错误是一个包含字段和消息的对象，而不是一个Error实例
    if (errorOrValidation && errorOrValidation.message) {
      // API Error
       ElMessage.error(errorOrValidation.message || '创建失败，请稍后重试')
    } else {
      // Validation Error
      console.log('表单验证失败:', errorOrValidation)
      ElMessage.error('请检查并修正表单中的错误项')
      // Do not re-throw the validation error. Let the component handle it gracefully.
      // throw errorOrValidation
    }
  }
}

const onCancel = () => router.push('/download-center/tasks')

// Expose the method for testing purposes
defineExpose({
  onSubmit
})
</script>

<style scoped>
.create-task-container {
  padding: 24px 32px;
  background: #f6f8fa;
}
.form-card {
  max-width: 680px;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0000000d;
}
.card-header {
  font-size: 20px;
  font-weight: bold;
}
.el-form-item {
    margin-bottom: 22px;
}
.el-select {
  width: 100%;
}
.action-buttons {
  margin-top: 16px;
}
.action-buttons :deep(.el-form-item__content) {
  justify-content: flex-end;
}
</style>
