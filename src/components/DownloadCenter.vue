<template>
  <div class="download-center">
    <!-- 顶部用户信息区域 -->
    <div class="header">
      <div class="header-left">
        <h1 class="title">媒体下载服务</h1>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleUserAction">
          <span class="user-info">
            <el-icon class="user-icon"><User /></el-icon>
            <span class="username">{{ authStore.username || '用户' }}</span>
            <el-icon class="arrow-down"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人信息
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div class="main-content">
      <!-- 左侧导航菜单 -->
      <div class="sidebar">
        <el-menu
          :default-active="activeMenu"
          mode="vertical"
          @select="handleMenuSelect"
          class="nav-menu"
        >
          <el-menu-item index="/download-center/tasks">
            <el-icon><List /></el-icon>
            <span>下载任务列表</span>
          </el-menu-item>
          
          <el-menu-item index="/download-center/tasks/create">
            <el-icon><Plus /></el-icon>
            <span>创建下载任务</span>
          </el-menu-item>
          
          <el-sub-menu index="failures">
            <template #title>
              <el-icon><Warning /></el-icon>
              <span>失败记录管理</span>
            </template>
            <el-menu-item index="/download-center/failures">
              <el-icon><DocumentRemove /></el-icon>
              <span>下载失败记录</span>
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="videos">
            <template #title>
              <el-icon><VideoPlay /></el-icon>
              <span>视频管理</span>
            </template>
            <el-menu-item index="/download-center/videos">
              <el-icon><Folder /></el-icon>
              <span>已下载视频</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 右侧内容区域 -->
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDownloadStore } from '@/stores/download';
import { 
  User, 
  ArrowDown, 
  SwitchButton, 
  List, 
  Plus, 
  Warning, 
  DocumentRemove, 
  VideoPlay, 
  Folder 
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const downloadStore = useDownloadStore();

// 当前激活的菜单项
const activeMenu = ref('');

// 当前任务ID（用于动态菜单显示）
const currentTaskId = computed(() => {
  return route.params.taskId || null;
});

// 监听路由变化，更新激活菜单
watch(
  () => route.path,
  (newPath) => {
    activeMenu.value = newPath;
  },
  { immediate: true }
);

// 处理菜单选择
const handleMenuSelect = (index) => {
  if (index !== route.path) {
    router.push(index);
  }
};

// 处理用户操作
const handleUserAction = async (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能待实现');
      break;
      
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '确认退出',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        // 执行登出
        authStore.logout();
        ElMessage.success('已退出登录');
      } catch {
        // 用户取消登出
      }
      break;
  }
};

// 初始化页面
onMounted(() => {
  console.log('下载中心页面已挂载');
  
  // 开始轮询更新（如果有正在进行的任务）
  downloadStore.startPolling(5000);
});

// 清理资源
onUnmounted(() => {
  console.log('下载中心页面已卸载');
  
  // 停止轮询
  downloadStore.stopPolling();
});
</script>

<style scoped>
.download-center {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

/* 顶部头部区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-left .title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.user-info:hover {
  background-color: #f3f4f6;
}

.user-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #6b7280;
}

.username {
  margin-right: 8px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.arrow-down {
  font-size: 12px;
  color: #9ca3af;
}

/* 主体内容区域 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧导航栏 */
.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.nav-menu {
  border-right: none;
  padding: 16px 0;
}

.nav-menu .el-menu-item,
.nav-menu .el-sub-menu__title {
  height: 48px;
  line-height: 48px;
  margin: 0 16px 8px;
  border-radius: 8px;
  border: none !important;
}

.nav-menu .el-menu-item.is-active {
  background-color: #eff6ff;
  color: #2563eb;
}

.nav-menu .el-menu-item:hover,
.nav-menu .el-sub-menu__title:hover {
  background-color: #f9fafb;
}

.nav-menu .el-icon {
  margin-right: 12px;
  font-size: 16px;
}

/* 右侧内容区域 */
.content-area {
  flex: 1;
  overflow: auto;
  background: #f5f7fa;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .header {
    padding: 0 16px;
  }
  
  .header-left .title {
    font-size: 18px;
  }
  
  .nav-menu .el-menu-item,
  .nav-menu .el-sub-menu__title {
    margin: 0 8px 4px;
  }
}

@media (max-width: 640px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    order: 2;
  }
  
  .content-area {
    order: 1;
    min-height: 60vh;
  }
  
  .nav-menu {
    display: flex;
    overflow-x: auto;
    padding: 8px 16px;
  }
  
  .nav-menu .el-menu-item,
  .nav-menu .el-sub-menu {
    flex-shrink: 0;
    margin-right: 8px;
  }
}
</style>