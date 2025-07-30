import axios from 'axios'
import { z } from 'zod';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 10000
})

// 下载任务相关
export const getDownloadTasks = (params) => request.get('/download/tasks', { params })
export const createDownloadTask = (data) => request.post('/download/tasks', data)
export const getDownloadTaskDetail = (taskId) => request.get(`/download/tasks/${taskId}`)
export const deleteDownloadTask = (taskId) => request.delete(`/download/tasks/${taskId}`)
export const retryDownloadTask = (taskId) => request.post(`/download/tasks/${taskId}/retry`)
export const startDownloadTask = (taskId) => request.post(`/download/tasks/${taskId}/start`)

// 失败记录
export const getTaskFailures = (taskId, params = {}) => {
  // 如果有 taskId，访问 /tasks/{taskId}/failures
  // 如果没有 taskId，访问 /failures
  if (taskId) {
    return request.get(`/download/tasks/${taskId}/failures`, { params })
  } else {
    return request.get('/download/tasks/failures', { params })
  }
}
export const retryFailure = (taskId, failureId) => request.post(`/download/tasks/${taskId}/failures/${failureId}/retry`)
export const abandonFailure = (taskId, failureId) => request.post(`/download/tasks/${taskId}/failures/${failureId}/abandon`)
export const createDownloadFailure = (taskId, data) => request.post(`/download/tasks/${taskId}/failures`, data)

// 单任务下已下载视频
export const createDownloadedVideo = (taskId, data) => request.post(`/download/tasks/${taskId}/videos`, data)
export const getDownloadedVideosByTask = (taskId, params) => request.get(`/download/tasks/${taskId}/videos`, { params })

// 校验URL格式
export function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 校验 video_id 格式（如 1234567890_xxxx）
export function isValidVideoId(id) {
  return /^[0-9]{10,16}_[a-zA-Z0-9]{4,}$/.test(id)
}

export const downloadTaskSchema = z.object({
  id: z.string(), // UUID
  video_id: z.string(),
  liveroom_id: z.string(),
  liveroom_title: z.string().nullable(),
  liveroom_url: z.string().nullable(),
  resource_url: z.string(),
  resource_type: z.enum(['hls', 'mp4', 'image']),
  status: z.enum(['pending', 'processing', 'completed', 'partial_completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(1),
  retry_count: z.number().int(),
  last_error: z.string().nullable(),
  created_at: z.string(), // 可加 .refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date' })
  updated_at: z.string(),
  completed_at: z.string().nullable(),
}).passthrough();

export const downloadTaskListSchema = z.array(downloadTaskSchema);

// 新增：用于校验分页响应的 schema
export const paginatedTasksSchema = z.object({
  items: downloadTaskListSchema, // 将 'tasks' 改为 'items'
  total: z.number().int(),
});

export async function fetchDownloadTasks(params) {
  const response = await getDownloadTasks(params);
  // 使用新的 schema 来校验嵌套的 response.data.data 对象
  const result = paginatedTasksSchema.safeParse(response.data.data);
  if (!result.success) {
    console.error('API response validation failed:', result.error.flatten());
    console.error('Invalid data received:', response.data); // 打印原始数据，方便调试
    throw new Error('API 数据格式错误');
  }
  // 返回校验通过的整个对象
  return result.data;
}
