/**
 * 下载状态管理
 * 管理下载任务、失败记录、已下载视频的状态
 */
import { defineStore } from 'pinia';
import { downloadAPI } from '@/api/download';

export const useDownloadStore = defineStore('download', {
  state: () => ({
    // 下载任务列表
    tasks: [],
    tasksTotal: 0,
    tasksLoading: false,
    tasksError: null,
    
    // 当前任务详情
    currentTask: null,
    currentTaskLoading: false,
    currentTaskError: null,
    
    // 失败记录列表
    failures: [],
    failuresTotal: 0,
    failuresLoading: false,
    failuresError: null,
    
    // 已下载视频列表
    videos: [],
    videosTotal: 0,
    videosLoading: false,
    videosError: null,
    
    // 分页和筛选参数
    tasksParams: {
      page: 1,
      size: 20,
      sort: 'created_at:desc',
      status: undefined,
      resource_type: undefined,
      liveroom_id: undefined
    },
    
    failuresParams: {
      page: 1,
      size: 20,
      sort: 'created_at:desc',
      status: undefined,
      failure_type: undefined
    },
    
    videosParams: {
      page: 1,
      size: 20,
      sort: 'created_at:desc',
      resource_type: undefined
    },
    
    // 实时更新相关
    pollingInterval: null,
    pollingEnabled: false,
    websocketConnection: null
  }),
  
  getters: {
    // 获取指定状态的任务数量
    getTaskCountByStatus: (state) => {
      return (status) => state.tasks.filter(task => task.status === status).length;
    },
    
    // 获取正在进行的任务
    getProcessingTasks: (state) => {
      return state.tasks.filter(task => 
        task.status === 'processing' || task.status === 'pending'
      );
    },
    
    // 获取已完成的任务
    getCompletedTasks: (state) => {
      return state.tasks.filter(task => 
        task.status === 'completed' || task.status === 'partial_completed'
      );
    },
    
    // 获取失败的任务
    getFailedTasks: (state) => {
      return state.tasks.filter(task => task.status === 'failed');
    },
    
    // 检查是否有正在进行的任务
    hasProcessingTasks: (state) => {
      return state.tasks.some(task => 
        task.status === 'processing' || task.status === 'pending'
      );
    }
  },
  
  actions: {
    // ==================== 任务列表管理 ====================
    
    /**
     * 获取任务列表
     * @param {object} params - 查询参数
     */
    async fetchTasks(params = {}) {
      this.tasksLoading = true;
      this.tasksError = null;
      
      try {
        // 合并参数
        const queryParams = { ...this.tasksParams, ...params };
        this.tasksParams = queryParams;
        
        // 过滤掉空值参数，避免后端验证失败
        const cleanParams = Object.fromEntries(
          Object.entries(queryParams).filter(([key, value]) => 
            value !== undefined && value !== null && value !== ''
          )
        );
        
        console.log('发送查询参数:', cleanParams);
        
        const response = await downloadAPI.getTasks(cleanParams);
        
        this.tasks = response.items || [];
        this.tasksTotal = response.total || 0;
        
        console.log(`获取任务列表成功: ${this.tasks.length}/${this.tasksTotal}`);
      } catch (error) {
        console.error('获取任务列表失败:', error);
        this.tasksError = error.message;
        this.tasks = [];
        this.tasksTotal = 0;
      } finally {
        this.tasksLoading = false;
      }
    },
    
    /**
     * 刷新任务列表
     */
    async refreshTasks() {
      await this.fetchTasks(this.tasksParams);
    },
    
    /**
     * 创建新任务
     * @param {object} taskData - 任务数据
     */
    async createTask(taskData) {
      try {
        const newTask = await downloadAPI.createTask(taskData);
        
        // 添加到列表开头
        this.tasks.unshift(newTask);
        this.tasksTotal += 1;
        
        console.log('任务创建成功:', newTask.id);
        return newTask;
      } catch (error) {
        console.error('创建任务失败:', error);
        throw error;
      }
    },
    
    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     */
    async deleteTask(taskId) {
      try {
        await downloadAPI.deleteTask(taskId);
        
        // 从列表中移除
        const index = this.tasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
          this.tasks.splice(index, 1);
          this.tasksTotal -= 1;
        }
        
        // 如果是当前任务，清除详情
        if (this.currentTask?.id === taskId) {
          this.currentTask = null;
        }
        
        console.log('任务删除成功:', taskId);
      } catch (error) {
        console.error('删除任务失败:', error);
        throw error;
      }
    },
    
    /**
     * 开始下载任务
     * @param {string} taskId - 任务ID
     */
    async startTask(taskId) {
      try {
        const updatedTask = await downloadAPI.startTask(taskId);
        
        // 更新列表中的任务
        this.updateTaskInList(updatedTask);
        
        // 更新当前任务详情
        if (this.currentTask?.id === taskId) {
          this.currentTask = updatedTask;
        }
        
        console.log('任务开始下载成功:', taskId);
        return updatedTask;
      } catch (error) {
        console.error('开始下载任务失败:', error);
        throw error;
      }
    },

    /**
     * 重试任务
     * @param {string} taskId - 任务ID
     */
    async retryTask(taskId) {
      try {
        const updatedTask = await downloadAPI.retryTask(taskId);
        
        // 更新列表中的任务
        this.updateTaskInList(updatedTask);
        
        // 更新当前任务详情
        if (this.currentTask?.id === taskId) {
          this.currentTask = updatedTask;
        }
        
        console.log('任务重试成功:', taskId);
        return updatedTask;
      } catch (error) {
        console.error('重试任务失败:', error);
        throw error;
      }
    },
    
    // ==================== 任务详情管理 ====================
    
    /**
     * 获取任务详情
     * @param {string} taskId - 任务ID
     */
    async fetchTaskDetail(taskId) {
      this.currentTaskLoading = true;
      this.currentTaskError = null;
      
      try {
        const task = await downloadAPI.getTaskDetail(taskId);
        this.currentTask = task;
        
        // 同时更新列表中的任务
        this.updateTaskInList(task);
        
        console.log('获取任务详情成功:', taskId);
        return task;
      } catch (error) {
        console.error('获取任务详情失败:', error);
        this.currentTaskError = error.message;
        this.currentTask = null;
        throw error;
      } finally {
        this.currentTaskLoading = false;
      }
    },
    
    /**
     * 清除当前任务详情
     */
    clearCurrentTask() {
      this.currentTask = null;
      this.currentTaskError = null;
    },
    
    // ==================== 失败记录管理 ====================
    
    /**
     * 获取失败记录列表
     * @param {string} taskId - 任务ID（可选，如果不提供则查询全局失败记录）
     * @param {object} params - 查询参数
     */
    async fetchFailures(taskId, params = {}) {
      this.failuresLoading = true;
      this.failuresError = null;
      
      try {
        const queryParams = { ...this.failuresParams, ...params };
        this.failuresParams = queryParams;
        
        let response;
        if (taskId) {
          // 查询特定任务的失败记录
          response = await downloadAPI.getFailures(taskId, queryParams);
        } else {
          // 查询全局失败记录
          response = await downloadAPI.getGlobalFailures(queryParams);
        }
        
        this.failures = response.items || [];
        this.failuresTotal = response.total || 0;
        
        console.log(`获取失败记录成功: ${this.failures.length}/${this.failuresTotal}`);
      } catch (error) {
        console.error('获取失败记录失败:', error);
        this.failuresError = error.message;
        this.failures = [];
        this.failuresTotal = 0;
      } finally {
        this.failuresLoading = false;
      }
    },
    
    /**
     * 重试失败记录
     * @param {string} taskId - 任务ID（可选，如果不提供则重试全局失败记录）
     * @param {string} failureId - 失败记录ID
     */
    async retryFailure(taskId, failureId) {
      try {
        if (taskId) {
          // 重试特定任务的失败记录
          await downloadAPI.retryFailure(taskId, failureId);
        } else {
          // 重试全局失败记录
          await downloadAPI.retryGlobalFailure(failureId);
        }
        
        // 刷新失败记录列表
        await this.fetchFailures(taskId, this.failuresParams);
        
        console.log('失败记录重试成功:', failureId);
      } catch (error) {
        console.error('重试失败记录失败:', error);
        throw error;
      }
    },
    
    /**
     * 放弃失败记录
     * @param {string} taskId - 任务ID（可选，如果不提供则放弃全局失败记录）
     * @param {string} failureId - 失败记录ID
     */
    async abandonFailure(taskId, failureId) {
      try {
        if (taskId) {
          // 放弃特定任务的失败记录
          await downloadAPI.abandonFailure(taskId, failureId);
        } else {
          // 放弃全局失败记录
          await downloadAPI.abandonGlobalFailure(failureId);
        }
        
        // 刷新失败记录列表
        await this.fetchFailures(taskId, this.failuresParams);
        
        console.log('失败记录放弃成功:', failureId);
      } catch (error) {
        console.error('放弃失败记录失败:', error);
        throw error;
      }
    },
    
    // ==================== 已下载视频管理 ====================
    
    /**
     * 获取已下载视频列表
     * @param {string} taskId - 任务ID（可选，如果不提供则查询全局视频记录）
     * @param {object} params - 查询参数
     */
    async fetchVideos(taskId, params = {}) {
      this.videosLoading = true;
      this.videosError = null;
      
      try {
        // 清理参数，过滤掉 undefined 和 null 值
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
        );
        
        const queryParams = { ...this.videosParams, ...cleanParams };
        this.videosParams = queryParams;
        
        console.log('Store fetchVideos - 清理后的参数:', cleanParams);
        console.log('Store fetchVideos - 最终查询参数:', queryParams);
        console.log('Store fetchVideos - 任务ID:', taskId);
        
        let response;
        if (taskId) {
          // 查询特定任务的已下载视频
          console.log('Store fetchVideos - 调用 getVideos');
          response = await downloadAPI.getVideos(taskId, queryParams);
        } else {
          // 查询全局已下载视频
          console.log('Store fetchVideos - 调用 getGlobalVideos');
          response = await downloadAPI.getGlobalVideos(queryParams);
        }
        
        this.videos = response.items || [];
        this.videosTotal = response.total || 0;
        
        console.log(`获取已下载视频成功: ${this.videos.length}/${this.videosTotal}`);
      } catch (error) {
        console.error('获取已下载视频失败:', error);
        this.videosError = error.message;
        this.videos = [];
        this.videosTotal = 0;
      } finally {
        this.videosLoading = false;
      }
    },
    
    // ==================== 辅助方法 ====================
    
    /**
     * 更新列表中的任务
     * @param {object} updatedTask - 更新的任务数据
     */
    updateTaskInList(updatedTask) {
      const index = this.tasks.findIndex(task => task.id === updatedTask.id);
      if (index !== -1) {
        this.tasks[index] = { ...this.tasks[index], ...updatedTask };
      }
    },
    
    /**
     * 重置所有状态
     */
    resetAllState() {
      this.tasks = [];
      this.tasksTotal = 0;
      this.currentTask = null;
      this.failures = [];
      this.failuresTotal = 0;
      this.videos = [];
      this.videosTotal = 0;
      
      this.tasksError = null;
      this.currentTaskError = null;
      this.failuresError = null;
      this.videosError = null;
      
      this.stopPolling();
      this.disconnectWebSocket();
    },
    
    // ==================== 实时更新 ====================
    
    /**
     * 开始轮询更新
     * @param {number} interval - 轮询间隔（毫秒）
     */
    startPolling(interval = 5000) {
      this.stopPolling();
      
      this.pollingEnabled = true;
      this.pollingInterval = setInterval(async () => {
        if (this.pollingEnabled) {
          // 如果有正在进行的任务，刷新任务列表
          if (this.hasProcessingTasks) {
            await this.refreshTasks();
          }
          
          // 如果有当前任务详情，刷新详情
          if (this.currentTask && 
              (this.currentTask.status === 'processing' || this.currentTask.status === 'pending')) {
            await this.fetchTaskDetail(this.currentTask.id);
          }
        }
      }, interval);
      
      console.log(`开始轮询更新，间隔: ${interval}ms`);
    },
    
    /**
     * 停止轮询更新
     */
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      this.pollingEnabled = false;
      console.log('停止轮询更新');
    },
    
    /**
     * 连接WebSocket（如果后端支持）
     */
    connectWebSocket() {
      // TODO: 实现WebSocket连接
      console.log('WebSocket连接功能待实现');
    },
    
    /**
     * 断开WebSocket连接
     */
    disconnectWebSocket() {
      if (this.websocketConnection) {
        this.websocketConnection.close();
        this.websocketConnection = null;
      }
    }
  }
});
