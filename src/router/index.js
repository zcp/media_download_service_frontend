// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import DownloadCenter from '@/components/DownloadCenter.vue'
import DownloadTaskList from '@/components/DownloadTaskList.vue'
import DownloadTaskCreate from '@/components/DownloadTaskCreate.vue'
import DownloadTaskDetail from '@/components/DownloadTaskDetail.vue'
import DownloadFailures from '@/components/DownloadFailures.vue'
import DownloadedVideos from '@/components/DownloadedVideos.vue'
import TaskVideosDetail from '@/components/DownloadVideosDetail.vue'

const routes = [
  {
    path: '/',
    redirect: '/download-center/tasks'
  },
  {
    path: '/download-center',
    component: DownloadCenter,
    children: [
      { path: 'tasks', component: DownloadTaskList },
      { path: 'tasks/create', component: DownloadTaskCreate },
      { path: 'tasks/:taskId', component: DownloadTaskDetail },
      { path: 'tasks/:taskId/failures', component: DownloadFailures },
      { path: 'failures', component: DownloadFailures },
      { path: 'videos', component: DownloadedVideos },
      { path: ':taskId/videos', component: TaskVideosDetail },
    ]
  }
]

export default createRouter({
  history: createWebHistory('/'),  // 设置base路径
  routes
})
