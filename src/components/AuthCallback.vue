<template>
  <div class="auth-callback">
    <div class="loading-container">
      <el-loading :visible="true" text="登录处理中..." />
      <div class="status-text">
        <p v-if="status === 'processing'">正在处理登录信息...</p>
        <p v-else-if="status === 'success'">登录成功，正在跳转...</p>
        <p v-else-if="status === 'error'">登录失败：{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const status = ref('processing'); // 'processing', 'success', 'error'
const errorMessage = ref('');

onMounted(async () => {
  console.log('AuthCallback页面加载，处理登录回调...');
  
  try {
    // 从URL参数中获取Token
    const token = route.query.token || route.hash.match(/access_token=([^&]*)/)?.[1];
    
    if (!token) {
      throw new Error('未找到访问令牌');
    }
    
    console.log('获取到Token，设置认证状态...');
    
    // 设置Token到store
    const success = authStore.setToken(token);
    
    if (!success) {
      throw new Error('Token设置失败');
    }
    
    status.value = 'success';
    
    // 获取重定向路径
    const redirectUrl = route.query.state || route.query.redirect_uri || localStorage.getItem('auth_redirect_path');
    
    console.log('登录成功，准备跳转到:', redirectUrl);
    
    // 清除临时存储的重定向路径
    localStorage.removeItem('auth_redirect_path');
    
    // 延迟跳转，让用户看到成功信息
    setTimeout(() => {
      if (redirectUrl && redirectUrl.startsWith('http')) {
        // 完整URL跳转
        window.location.href = redirectUrl;
      } else if (redirectUrl && redirectUrl.startsWith('/')) {
        // 相对路径跳转
        router.push(redirectUrl);
      } else {
        // 默认跳转到任务列表
        router.push('/download-center/tasks');
      }
    }, 1000);
    
  } catch (error) {
    console.error('登录回调处理失败:', error);
    status.value = 'error';
    errorMessage.value = error.message;
    
    // 3秒后跳转到登录页面
    setTimeout(() => {
      authStore.logout();
    }, 3000);
  }
});
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-container {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.status-text {
  margin-top: 20px;
}

.status-text p {
  font-size: 16px;
  color: #606266;
  margin: 0;
}
</style>
