<template>
  <div id="app">
    <!-- 主路由视图 -->
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useDownloadStore } from '@/stores/download';

const authStore = useAuthStore();
const downloadStore = useDownloadStore();

// 应用挂载时的处理
onMounted(() => {
  console.log('App组件已挂载');
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 监听页面刷新/关闭事件
  window.addEventListener('beforeunload', handleBeforeUnload);
});

// 应用卸载时的清理
onUnmounted(() => {
  console.log('App组件已卸载');
  
  // 清理事件监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  
  // 清理定时器和连接
  downloadStore.stopPolling();
  downloadStore.disconnectWebSocket();
});

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面隐藏时，停止轮询
    downloadStore.stopPolling();
    console.log('页面隐藏，停止轮询');
  } else {
    // 页面显示时，如果用户已认证且有正在进行的任务，重新开始轮询
    if (authStore.isAuthenticated && downloadStore.hasProcessingTasks) {
      downloadStore.startPolling(5000);
      console.log('页面显示，重新开始轮询');
    }
  }
};

// 页面刷新/关闭前的处理
const handleBeforeUnload = (event) => {
  // 如果有正在进行的重要操作，可以在这里提示用户
  const hasImportantTasks = downloadStore.getProcessingTasks.length > 0;
  
  if (hasImportantTasks) {
    const message = '您有正在进行的下载任务，确定要离开吗？';
    event.returnValue = message;
    return message;
  }
};
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
  overflow-x: hidden;
}

/* 页面切换动画 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

/* 滚动条样式优化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 全局样式调整 */
.el-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
}

.el-button {
  border-radius: 6px;
}

.el-input__wrapper {
  border-radius: 6px;
}

.el-select .el-input__wrapper {
  border-radius: 6px;
}

/* 工具类 */
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ml-2 {
  margin-left: 8px;
}

.mr-2 {
  margin-right: 8px;
}

.mt-2 {
  margin-top: 8px;
}

.mb-2 {
  margin-bottom: 8px;
}

.p-4 {
  padding: 16px;
}

/* 响应式断点 */
@media (max-width: 768px) {
  body {
    font-size: 13px;
  }
  
  .el-card {
    margin: 8px;
  }
}

/* 暗色主题预留（可选） */
@media (prefers-color-scheme: dark) {
  /* 暗色主题样式可以在这里定义 */
}

/* 打印样式 */
@media print {
  * {
    background: white !important;
    color: black !important;
  }
  
  .no-print {
    display: none !important;
  }
}
</style>