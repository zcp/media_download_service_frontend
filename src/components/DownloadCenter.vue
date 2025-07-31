<template>
  <el-container class="download-center-layout">
    <!-- 侧边栏 -->
    <el-aside width="210px" class="sidebar">
      <div class="logo-bar">
        <span class="system-title">媒体下载中心</span>
      </div>
      <el-menu :default-active="activeMenu" router class="menu" background-color="#f8f9fa" text-color="#222" active-text-color="#409EFF">
        <el-menu-item index="/download-center/tasks">
          <el-icon><Document /></el-icon>
          <span>下载任务列表</span>
        </el-menu-item>
        <el-menu-item index="/download-center/tasks/create">
          <el-icon><Plus /></el-icon>
          <span>创建下载任务</span>
        </el-menu-item>
        <el-menu-item index="/download-center/videos">
          <el-icon><VideoCamera /></el-icon>
          <span>已下载视频</span>
        </el-menu-item>
        <el-menu-item index="/download-center/failures">
          <el-icon><Warning /></el-icon>
          <span>下载失败</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <!-- 主内容区 -->
    <el-main class="main-content">
      <div class="main-inner">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { Document, Plus, Warning, VideoCamera } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => {
  if (route.path.startsWith('/download-center/tasks/create')) return '/download-center/tasks/create'
  // 检查任务的已下载视频页面 (/:taskId/videos)
  if (route.path.match(/^\/download-center\/[^\/]+\/videos/)) return '/download-center/videos'
  if (route.path.startsWith('/download-center/failures')) return '/download-center/failures'
  if (route.path.startsWith('/download-center/tasks')) return '/download-center/tasks'
  if (route.path.startsWith('/download-center/videos')) return '/download-center/videos'
  return '/download-center/tasks'
})
</script>

<style scoped>
.download-center-layout {
  min-height: 100vh;
  background: #f6f8fa;
}
.sidebar {
  background: #f8f9fa;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
}
.logo-bar {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 18px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}
.logo {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}
.system-title {
  font-size: 18px;
  font-weight: 600;
  color: #222;
  letter-spacing: 1px;
}
.menu {
  border-right: none;
  margin-top: 0px;
}
.el-menu-item {
  font-size: 16px;
  height: 48px;
  line-height: 48px;
  border-radius: 6px;
  margin: 0 8px;
}
.el-menu-item.is-active {
  background: #e6f0fa !important;
  color: #409EFF !important;
}
.main-content {
  background: #f6f8fa;
  min-height: 100vh;
  padding: 0;
}
.main-inner {
  margin: 2px 0 0 0;
  padding: 0 2px 2px 2px;
  min-height: 90vh;
}
@media (max-width: 900px) {
  .main-inner {
    padding: 0 4px 12px 4px;
  }
  .sidebar {
    width: 100px !important;
  }
  .system-title {
    display: none;
  }
}
</style>
