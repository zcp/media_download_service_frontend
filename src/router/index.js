/**
 * Vue Router 路由配置
 * 包含路由定义和路由守卫
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { isTokenValid } from '@/utils/auth';

import { LOGIN_URL, APP_BASE_PATH } from '@/constants/api';  // �� 修改这一行
// 路由组件懒加载
const DownloadCenter = () => import('@/components/DownloadCenter.vue');
const DownloadTaskList = () => import('@/components/DownloadTaskList.vue');
const DownloadTaskCreate = () => import('@/components/DownloadTaskCreate.vue');
const DownloadTaskDetail = () => import('@/components/DownloadTaskDetail.vue');
const DownloadFailures = () => import('@/components/DownloadFailures.vue');
const DownloadVideosDetail = () => import('@/components/DownloadVideosDetail.vue');
const AuthCallback = () => import('@/components/AuthCallback.vue');

// 需要认证的路由列表
const protectedRoutes = [
  '/download-center',
  '/download-center/tasks',
  '/download-center/tasks/create',
  '/download-center/tasks/:taskId',
  '/download-center/tasks/:taskId/failures',
  '/download-center/tasks/:taskId/videos',
  '/download-center/failures',
  '/download-center/videos'
];

/**
 * 检查路由是否需要认证
 * @param {string} path - 路由路径
 * @returns {boolean} - 是否需要认证
 */
function isProtectedRoute(path) {
  return protectedRoutes.some(route => {
    // 处理动态路由参数
    const routePattern = route.replace(':taskId', '[^/]+');
    const regex = new RegExp(`^${routePattern}(/.*)?$`);
    return regex.test(path);
  });
}

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/download-center'
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallback,
    meta: {
      title: '登录处理中',
      requiresAuth: false
    }
  },
  {
    path: '/download-center',
    name: 'DownloadCenter',
    component: DownloadCenter,
    meta: {
      title: '下载中心',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/download-center/tasks'
      },
      {
        path: 'tasks',
        name: 'DownloadTaskList',
        component: DownloadTaskList,
        meta: {
          title: '下载任务列表',
          requiresAuth: true
        }
      },
      {
        path: 'tasks/create',
        name: 'DownloadTaskCreate',
        component: DownloadTaskCreate,
        meta: {
          title: '创建下载任务',
          requiresAuth: true
        }
      },
      {
        path: 'tasks/:taskId',
        name: 'DownloadTaskDetail',
        component: DownloadTaskDetail,
        props: true,
        meta: {
          title: '任务详情',
          requiresAuth: true
        }
      },
      {
        path: 'tasks/:taskId/failures',
        name: 'DownloadFailures',
        component: DownloadFailures,
        props: true,
        meta: {
          title: '下载失败记录',
          requiresAuth: true
        }
      },
      {
        path: 'tasks/:taskId/videos',
        name: 'DownloadVideosDetail',
        component: DownloadVideosDetail,
        props: true,
        meta: {
          title: '已下载视频',
          requiresAuth: true
        }
      },
      {
        path: 'failures',
        name: 'DownloadFailuresGlobal',
        component: DownloadFailures,
        meta: {
          title: '下载失败记录',
          requiresAuth: true
        }
      },
      {
        path: 'videos',
        name: 'DownloadVideosGlobal',
        component: DownloadVideosDetail,
        meta: {
          title: '已下载视频',
          requiresAuth: true
        }
      }
    ]
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/NotFound.vue'),
    meta: {
      title: '页面未找到'
    }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 路由切换时的滚动行为
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  console.log(`路由导航: ${from.path} -> ${to.path}`);

  // 更新页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 媒体下载服务`;
  }

  // 检查是否需要认证
  const requiresAuth = to.meta?.requiresAuth || isProtectedRoute(to.path);

  if (requiresAuth) {
    const authStore = useAuthStore();

    console.log('检查认证状态...');

    // 检查Token是否存在
    const savedToken = localStorage.getItem('jwt_token');
    if (!savedToken) {
      console.log('未找到Token，跳转登录');
      authStore.setRedirectPath(to.fullPath);

      // 保存原始路径到localStorage
      localStorage.setItem('auth_redirect_path', to.fullPath);

      // 构建包含应用基础路径的origin
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const appBasePath = APP_BASE_PATH.replace(/\/$/, ''); // 移除末尾的斜杠
      const originWithPath = `${originDomain}${appBasePath}`;
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originWithPath}`;

      console.log('跳转登录，原始路径:', to.fullPath);
      console.log('回调域名（含路径）:', originWithPath);
      window.location.href = loginUrlWithCallback;
      return;
    }

    // 检查Token是否有效
    if (!isTokenValid(savedToken)) {
      console.log('Token已过期，跳转登录');
      authStore.clearAuth();
      authStore.setRedirectPath(to.fullPath);

      // 保存原始路径到localStorage
      localStorage.setItem('auth_redirect_path', to.fullPath);

      // 构建包含应用基础路径的origin
      const originDomain = window.location.origin.replace('http://', '').replace('https://', '');
      const appBasePath = APP_BASE_PATH.replace(/\/$/, ''); // 移除末尾的斜杠
      const originWithPath = `${originDomain}${appBasePath}`;
      const loginUrlWithCallback = `${LOGIN_URL}?external_callback=true&origin=${originWithPath}`;

      console.log('Token过期，跳转登录，原始路径:', to.fullPath);
      console.log('回调域名（含路径）:', originWithPath);
      window.location.href = loginUrlWithCallback;
      return;
    }

    // Token有效，确保store中的认证状态正确
    if (!authStore.isAuthenticated) {
      console.log('恢复认证状态...');
      const success = authStore.setToken(savedToken);
      if (!success) {
        console.error('恢复认证状态失败');
        authStore.forceReauth(to.fullPath);
        return;
      }
    }

    console.log('认证检查通过');
    authStore.isAuthenticated = true;
  }

  next();
});

// 全局后置钩子
router.afterEach((to, from) => {
  console.log(`路由导航完成: ${to.path}`);

  // 在这里可以添加页面访问统计等逻辑
});

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error);

  // 可以在这里处理路由加载失败等错误
  if (error.message.includes('Loading chunk')) {
    // 处理代码分割加载失败
    window.location.reload();
  }
});

// 导出工具函数
export const routerUtils = {
  /**
   * 跳转到任务详情页
   * @param {string} taskId - 任务ID
   */
  goToTaskDetail(taskId) {
    router.push(`/download-center/tasks/${taskId}`);
  },

  /**
   * 跳转到失败记录页
   * @param {string} taskId - 任务ID
   */
  goToFailures(taskId) {
    router.push(`/download-center/tasks/${taskId}/failures`);
  },

  /**
   * 跳转到已下载视频页
   * @param {string} taskId - 任务ID
   */
  goToVideos(taskId) {
    router.push(`/download-center/tasks/${taskId}/videos`);
  },

  /**
   * 返回上一页
   */
  goBack() {
    router.back();
  },

  /**
   * 跳转到任务列表页
   */
  goToTaskList() {
    router.push('/download-center/tasks');
  },

  /**
   * 跳转到创建任务页
   */
  goToCreateTask() {
    router.push('/download-center/tasks/create');
  },

  /**
   * 检查当前路由是否匹配
   * @param {string} routeName - 路由名称
   * @returns {boolean} - 是否匹配
   */
  isCurrentRoute(routeName) {
    return router.currentRoute.value.name === routeName;
  },

  /**
   * 获取当前路由参数
   * @param {string} paramName - 参数名
   * @returns {string|undefined} - 参数值
   */
  getCurrentParam(paramName) {
    return router.currentRoute.value.params[paramName];
  }
};

export default router;
