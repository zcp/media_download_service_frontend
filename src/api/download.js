/**
 * 下载服务API封装
 * 封装所有与下载任务相关的API请求
 */
import { get, post, del, getWithPagination } from '@/utils/request';

export const downloadAPI = {
  // ==================== 下载任务相关 ====================
  
  /**
   * 获取下载任务列表
   * @param {object} params - 查询参数 {page, size, sort, status, resource_type, liveroom_id}
   * @returns {Promise} - 包含任务列表和分页信息的响应
   */
  getTasks(params = {}) {
    return getWithPagination('/api/v1/download/tasks', params);
  },
  
  /**
   * 创建新的下载任务
   * @param {object} taskData - 任务数据
   * @param {string} taskData.resource_url - 资源URL（必填）
   * @param {string} taskData.resource_type - 资源类型（必填，'hls', 'mp4', 'image'）
   * @param {string} taskData.video_id - 视频ID（必填，格式：{liveroom_id}_{uuid4后缀}）
   * @param {string} taskData.liveroom_id - 直播间ID（必填）
   * @param {string} [taskData.liveroom_title] - 直播间标题（可选）
   * @param {string} [taskData.liveroom_url] - 直播间URL（可选）
   * @returns {Promise} - 创建的任务对象
   */
  createTask(taskData) {
    // 验证必填字段
    const requiredFields = ['resource_url', 'resource_type', 'video_id', 'liveroom_id'];
    for (const field of requiredFields) {
      if (!taskData[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 验证resource_type
    const validTypes = ['hls', 'mp4', 'image'];
    if (!validTypes.includes(taskData.resource_type)) {
      throw new Error(`无效的资源类型: ${taskData.resource_type}，必须是: ${validTypes.join(', ')}`);
    }
    
    return post('/api/v1/download/tasks', taskData);
  },
  
  /**
   * 获取单个下载任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise} - 任务详情对象
   */
  getTaskDetail(taskId) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return get(`/api/v1/download/tasks/${taskId}`);
  },
  
  /**
   * 删除/取消下载任务
   * @param {string} taskId - 任务ID
   * @returns {Promise} - 删除结果
   */
  deleteTask(taskId) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return del(`/api/v1/download/tasks/${taskId}`);
  },
  
  /**
   * 开始下载任务
   * @param {string} taskId - 任务ID
   * @returns {Promise} - 更新后的任务对象
   */
  startTask(taskId) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/start`);
  },
  
  /**
   * 重试下载任务
   * @param {string}  taskId - 任务ID
   * @returns {Promise} - 更新后的任务对象
   */
  retryTask(taskId) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/retry`);
  },
  
  // ==================== 失败记录相关 ====================
  
  /**
   * 获取任务的失败记录列表
   * @param {string} taskId - 任务ID
   * @param {object} params - 查询参数 {page, size, sort, status, failure_type}
   * @returns {Promise} - 包含失败记录列表和分页信息的响应
   */
  getFailures(taskId, params = {}) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return getWithPagination(`/api/v1/download/tasks/${taskId}/failures`, params);
  },

  /**
   * 获取全局失败记录列表（不限制特定任务）
   * @param {object} params - 查询参数 {page, size, sort, status, failure_type}
   * @returns {Promise} - 包含失败记录列表和分页信息的响应
   */
  getGlobalFailures(params = {}) {
    return getWithPagination('/api/v1/download/failures', params);
  },
  
  /**
   * 创建失败记录
   * @param {string} taskId - 任务ID
   * @param {object} failureData - 失败记录数据
   * @returns {Promise} - 创建的失败记录对象
   */
  createFailure(taskId, failureData) {
    if (!taskId) {
      throw Error('任务ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/failures`, failureData);
  },
  
  /**
   * 重试单个失败资源
   * @param {string} taskId - 任务ID
   * @param {string} failureId - 失败记录ID
   * @returns {Promise} - 重试结果
   */
  retryFailure(taskId, failureId) {
    if (!taskId || !failureId) {
      throw new Error('任务ID和失败记录ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/failures/${failureId}/retry`);
  },

  /**
   * 重试全局失败记录（不限制特定任务）
   * @param {string} failureId - 失败记录ID
   * @returns {Promise} - 重试结果
   */
  retryGlobalFailure(failureId) {
    if (!failureId) {
      throw new Error('失败记录ID不能为空');
    }
    return post(`/api/v1/download/failures/${failureId}/retry`);
  },
  
  /**
   * 放弃单个失败资源
   * @param {string} taskId - 任务ID
   * @param {string} failureId - 失败记录ID
   * @returns {Promise} - 放弃结果
   */
  abandonFailure(taskId, failureId) {
    if (!taskId || !failureId) {
      throw new Error('任务ID和失败记录ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/failures/${failureId}/abandon`);
  },

  /**
   * 放弃全局失败记录（不限制特定任务）
   * @param {string} failureId - 失败记录ID
   * @returns {Promise} - 放弃结果
   */
  abandonGlobalFailure(failureId) {
    if (!failureId) {
      throw new Error('失败记录ID不能为空');
    }
    return post(`/api/v1/download/failures/${failureId}/abandon`);
  },
  
  // ==================== 已下载视频相关 ====================
  
  /**
   * 创建已下载视频记录
   * @param {string} taskId - 任务ID
   * @param {object} videoData - 视频数据
   * @returns {Promise} - 创建的视频记录对象
   */
  createVideo(taskId, videoData) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return post(`/api/v1/download/tasks/${taskId}/videos`, videoData);
  },
  
  /**
   * 获取单任务下的已下载视频列表
   * @param {string} taskId - 任务ID
   * @param {object} params - 查询参数 {page, size, sort, resource_type}
   * @returns {Promise} - 包含视频列表和分页信息的响应
   */
  getVideos(taskId, params = {}) {
    if (!taskId) {
      throw new Error('任务ID不能为空');
    }
    return getWithPagination(`/api/v1/download/tasks/${taskId}/videos`, params);
  },

  /**
   * 获取全局已下载视频列表（不限制特定任务）
   * @param {object} params - 查询参数 {page, size, sort, resource_type}
   * @returns {Promise} - 包含视频列表和分页信息的响应
   */
  getGlobalVideos(params = {}) {
    return getWithPagination('/api/v1/download/videos', params);
  },
  
  // ==================== 辅助方法 ====================
  
  /**
   * 批量操作任务
   * @param {string[]} taskIds - 任务ID列表
   * @param {string} action - 操作类型 ('retry', 'delete', 'start')
   * @returns {Promise} - 批量操作结果
   */
  async batchOperateTasks(taskIds, action) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('任务ID列表不能为空');
    }
    
    const validActions = ['retry', 'delete', 'start'];
    if (!validActions.includes(action)) {
      throw new Error(`无效的操作类型: ${action}，必须是: ${validActions.join(', ')}`);
    }
    
    const results = [];
    const errors = [];
    
    for (const taskId of taskIds) {
      try {
        let result;
        switch (action) {
          case 'retry':
            result = await this.retryTask(taskId);
            break;
          case 'delete':
            result = await this.deleteTask(taskId);
            break;
          case 'start':
            result = await this.startTask(taskId);
            break;
        }
        results.push({ taskId, success: true, data: result });
      } catch (error) {
        errors.push({ taskId, success: false, error: error.message });
      }
    }
    
    return {
      success: results,
      errors: errors,
      total: taskIds.length,
      successCount: results.length,
      errorCount: errors.length
    };
  },
  
  /**
   * 获取任务统计信息
   * @returns {Promise} - 统计信息对象
   */
  getTaskStats() {
    return get('/api/v1/download/tasks/stats');
  },
  
  /**
   * 搜索任务
   * @param {string} keyword - 搜索关键词
   * @param {object} params - 其他查询参数
   * @returns {Promise} - 搜索结果
   */
  searchTasks(keyword, params = {}) {
    if (!keyword) {
      throw new Error('搜索关键词不能为空');
    }
    
    return getWithPagination('/api/v1/download/tasks', {
      ...params,
      search: keyword
    });
  },
  
  /**
   * 导出任务列表
   * @param {object} params - 导出参数
   * @param {string} format - 导出格式 ('csv', 'excel')
   * @returns {Promise} - 导出文件
   */
  exportTasks(params = {}, format = 'csv') {
    const validFormats = ['csv', 'excel'];
    if (!validFormats.includes(format)) {
      throw new Error(`无效的导出格式: ${format}，必须是: ${validFormats.join(', ')}`);
    }
    
    return get('/api/v1/download/tasks/export', {
      ...params,
      format
    }, {
      responseType: 'blob'
    });
  }
};