import axios from 'axios';

// Detect protocol and use appropriate API base URL
const getApiBaseUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Use same protocol as the current page, fallback to HTTP for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//127.0.0.1:8000/api`;
  }
  
  // For production or other hosts
  return `${protocol}//${hostname}:8000/api`;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (userData) => api.put('/auth/profile/', userData),
  changePassword: (passwordData) => api.post('/auth/change-password/', passwordData),
  createFarmUser: (userData) => api.post('/auth/create-farm-user/', userData),
  getFarmUsers: () => api.get('/auth/farm-users/'),
  getFarmUser: (id) => api.get(`/auth/farm-users/${id}/`),
  updateFarmUser: (id, userData) => api.put(`/auth/farm-users/${id}/`, userData),
  deleteFarmUser: (id) => api.delete(`/auth/farm-users/${id}/`),
  
  // Superuser-only endpoints
  resetUserPassword: (userId, passwordData) => api.post(`/auth/reset-password/${userId}/`, passwordData),
  getAllUsers: () => api.get('/auth/all-users/'),
  getAdmins: () => api.get('/auth/admins/'),
  createAdmin: (userData) => api.post('/auth/create-admin/', userData),
};

export const farmAPI = {
  // General farm management (for admins)
  getFarms: () => api.get('/farms/'),
  createFarm: (farmData) => api.post('/farms/create/', farmData),
  getFarm: (id) => api.get(`/farms/${id}/`),
  updateFarm: (id, farmData) => api.put(`/farms/${id}/`, farmData),
  deleteFarm: (id) => api.delete(`/farms/${id}/`),
  
  // NEW: Farm User Dashboard APIs
  getMyFarms: () => api.get('/farms/my-farms/'),
  getFarmUserDashboard: () => api.get('/farms/dashboard/'),
  getFarmUserNotifications: (params) => api.get('/farms/my-notifications/', { params }),
  
  // NEW: Farm-specific APIs (no farm dropdown needed)
  getFarmDashboard: (farmId) => api.get(`/farms/${farmId}/dashboard/`),
  
  // Farm-specific Daily Tasks
  getFarmDailyTasks: (farmId, params) => api.get(`/farms/${farmId}/daily-tasks/`, { params }),
  submitFarmDailyTask: (farmId, taskData) => api.post(`/farms/${farmId}/daily-tasks/`, taskData),
  
  // Farm-specific Notifications (complete database isolation)
  getFarmNotifications: (farmId, params) => api.get(`/farms/${farmId}/notifications/`, { params }),
  createFarmNotification: (farmId, notificationData) => api.post(`/farms/${farmId}/notifications/`, notificationData),
  markFarmNotificationsAsRead: (farmId, notificationIds) => api.put(`/farms/${farmId}/notifications/`, { notification_ids: notificationIds }),
  
  // Admin Notification Management
  getAdminNotifications: () => api.get('/farms/admin/notifications/'),
  sendAdminNotification: (notificationData) => api.post('/farms/admin/notifications/', notificationData),
  
  // Farm-specific Sales (database isolated per farm)
  getFarmSales: (farmId, params) => api.get(`/farms/${farmId}/sales/`, { params }),
  createFarmSale: (farmId, saleData) => api.post(`/farms/${farmId}/sales/`, saleData),
  
  // Farm-specific Crop Stages
  getFarmCropStages: (farmId, params) => api.get(`/farms/${farmId}/crop-stages/`, { params }),
  createFarmCropStage: (farmId, stageData) => api.post(`/farms/${farmId}/crop-stages/`, stageData),
  getFarmCropStage: (farmId, stageId) => api.get(`/farms/${farmId}/crop-stages/${stageId}/`),
  updateFarmCropStage: (farmId, stageId, stageData) => api.put(`/farms/${farmId}/crop-stages/${stageId}/`, stageData),
  deleteFarmCropStage: (farmId, stageId) => api.delete(`/farms/${farmId}/crop-stages/${stageId}/`),
  
  // Farm-specific Spray/Irrigation Logs
  getFarmSprayIrrigationLogs: (farmId, params) => api.get(`/farms/${farmId}/spray-irrigation-logs/`, { params }),
  createFarmSprayIrrigationLog: (farmId, data) => api.post(`/farms/${farmId}/spray-irrigation-logs/`, data),
  
  // Farm-specific Fertigations
  getFarmFertigations: (farmId, params) => api.get(`/farms/${farmId}/fertigations/`, { params }),
  createFarmFertigation: (farmId, data) => api.post(`/farms/${farmId}/fertigations/`, data),
  getFarmFertigation: (farmId, fertigationId) => api.get(`/farms/${farmId}/fertigations/${fertigationId}/`),
  updateFarmFertigation: (farmId, fertigationId, data) => api.put(`/farms/${farmId}/fertigations/${fertigationId}/`, data),
  deleteFarmFertigation: (farmId, fertigationId) => api.delete(`/farms/${farmId}/fertigations/${fertigationId}/`),
  
  // Farm-specific Spray Schedules
  getFarmSpraySchedules: (farmId, params) => api.get(`/farms/${farmId}/spray-schedules/`, { params }),
  createFarmSpraySchedule: (farmId, data) => api.post(`/farms/${farmId}/spray-schedules/`, data),
  getFarmSpraySchedule: (farmId, scheduleId) => api.get(`/farms/${farmId}/spray-schedules/${scheduleId}/`),
  updateFarmSpraySchedule: (farmId, scheduleId, data) => api.put(`/farms/${farmId}/spray-schedules/${scheduleId}/`, data),
  deleteFarmSpraySchedule: (farmId, scheduleId) => api.delete(`/farms/${farmId}/spray-schedules/${scheduleId}/`),
  
  // Farm-specific Workers
  getFarmWorkers: (farmId, params) => api.get(`/farms/${farmId}/workers/`, { params }),
  createFarmWorker: (farmId, data) => api.post(`/farms/${farmId}/workers/`, data),
  getFarmWorker: (farmId, workerId) => api.get(`/farms/${farmId}/workers/${workerId}/`),
  updateFarmWorker: (farmId, workerId, data) => api.put(`/farms/${farmId}/workers/${workerId}/`, data),
  deleteFarmWorker: (farmId, workerId) => api.delete(`/farms/${farmId}/workers/${workerId}/`),
  
  // Farm-specific Worker Tasks
  getFarmWorkerTasks: (farmId, params) => api.get(`/farms/${farmId}/worker-tasks/`, { params }),
  createFarmWorkerTask: (farmId, data) => api.post(`/farms/${farmId}/worker-tasks/`, data),
  getFarmWorkerTask: (farmId, taskId) => api.get(`/farms/${farmId}/worker-tasks/${taskId}/`),
  updateFarmWorkerTask: (farmId, taskId, data) => api.put(`/farms/${farmId}/worker-tasks/${taskId}/`, data),
  deleteFarmWorkerTask: (farmId, taskId) => api.delete(`/farms/${farmId}/worker-tasks/${taskId}/`),
  
  // Farm-specific Issue Reports
  getFarmIssueReports: (farmId, params) => api.get(`/farms/${farmId}/issue-reports/`, { params }),
  createFarmIssueReport: (farmId, data) => api.post(`/farms/${farmId}/issue-reports/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFarmIssueReport: (farmId, issueId) => api.get(`/farms/${farmId}/issue-reports/${issueId}/`),
  updateFarmIssueReport: (farmId, issueId, data) => api.put(`/farms/${farmId}/issue-reports/${issueId}/`, data),
  deleteFarmIssueReport: (farmId, issueId) => api.delete(`/farms/${farmId}/issue-reports/${issueId}/`),
  
  // Farm-specific Expenditures
  getFarmExpenditures: (farmId, params) => api.get(`/farms/${farmId}/expenditures/`, { params }),
  createFarmExpenditure: (farmId, data) => api.post(`/farms/${farmId}/expenditures/`, data),
  getFarmExpenditure: (farmId, expenditureId) => api.get(`/farms/${farmId}/expenditures/${expenditureId}/`),
  updateFarmExpenditure: (farmId, expenditureId, data) => api.put(`/farms/${farmId}/expenditures/${expenditureId}/`, data),
  deleteFarmExpenditure: (farmId, expenditureId) => api.delete(`/farms/${farmId}/expenditures/${expenditureId}/`),
  
  // Farm-specific Sales
  getFarmSales: (farmId, params) => api.get(`/farms/${farmId}/sales/`, { params }),
  createFarmSale: (farmId, data) => api.post(`/farms/${farmId}/sales/`, data),
  getFarmSale: (farmId, saleId) => api.get(`/farms/${farmId}/sales/${saleId}/`),
  updateFarmSale: (farmId, saleId, data) => api.put(`/farms/${farmId}/sales/${saleId}/`, data),
  deleteFarmSale: (farmId, saleId) => api.delete(`/farms/${farmId}/sales/${saleId}/`),
  
  // Legacy APIs (for admin/superuser backward compatibility)
  getDailyTasks: (params) => api.get('/farms/daily-tasks/', { params }),
  submitDailyTask: (taskData) => api.post('/farms/daily-tasks/', taskData),
  getNotifications: (params) => api.get('/farms/notifications/', { params }),
  markNotificationsAsRead: (data) => api.put('/farms/notifications/', data),
  deleteNotifications: (data) => api.delete('/farms/notifications/', { data }),
  getSprayIrrigationLogs: (params) => api.get('/farms/spray-irrigation-logs/', { params }),
  createSprayIrrigationLog: (data) => api.post('/farms/spray-irrigation-logs/', data),
  getCropStages: (params) => api.get('/farms/crop-stages/', { params }),
  createCropStage: (stageData) => api.post('/farms/crop-stages/', stageData),
  updateCropStage: (stageId, stageData) => api.put(`/farms/crop-stages/${stageId}/`, stageData),
  deleteCropStage: (stageId) => api.delete(`/farms/crop-stages/${stageId}/`),
  importCropStages: (formData) => api.post('/farms/crop-stages/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportCropStages: () => api.get('/farms/crop-stages/export/', { responseType: 'blob' }),
  
  // Fertigation APIs
  getFertigations: (params) => api.get('/farms/fertigations/', { params }),
  createFertigation: (data) => api.post('/farms/fertigations/', data),
  updateFertigation: (id, data) => api.put(`/farms/fertigations/${id}/`, data),
  deleteFertigation: (id) => api.delete(`/farms/fertigations/${id}/`),
  getFertigationAnalytics: (params) => api.get('/farms/fertigations/analytics/', { params }),
  getFertigationSchedule: (params) => api.get('/farms/fertigations/schedule/', { params }),
  createFertigationSchedule: (data) => api.post('/farms/fertigations/schedule/', data),
  
  // Worker Management APIs
  getWorkers: (params) => api.get('/farms/workers/', { params }),
  createWorker: (data) => api.post('/farms/workers/', data),
  getWorker: (id) => api.get(`/farms/workers/${id}/`),
  updateWorker: (id, data) => api.put(`/farms/workers/${id}/`, data),
  deleteWorker: (id) => api.delete(`/farms/workers/${id}/`),
  
  // Worker Task Management APIs
  getWorkerTasks: (params) => api.get('/farms/worker-tasks/', { params }),
  createWorkerTask: (data) => api.post('/farms/worker-tasks/', data),
  getWorkerTask: (id) => api.get(`/farms/worker-tasks/${id}/`),
  updateWorkerTask: (id, data) => api.put(`/farms/worker-tasks/${id}/`, data),
  deleteWorkerTask: (id) => api.delete(`/farms/worker-tasks/${id}/`),
  getWorkerTaskAnalytics: (params) => api.get('/farms/worker-tasks/analytics/', { params }),
  
  // Worker Dashboard Summary
  getWorkerDashboardSummary: () => api.get('/farms/worker-dashboard/'),
  
  // Issue Report Management APIs
  getIssueReports: (params) => api.get('/farms/issue-reports/', { params }),
  createIssueReport: (data) => api.post('/farms/issue-reports/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getIssueReport: (id) => api.get(`/farms/issue-reports/${id}/`),
  updateIssueReport: (id, data) => api.put(`/farms/issue-reports/${id}/`, data),
  deleteIssueReport: (id) => api.delete(`/farms/issue-reports/${id}/`),
  
  // Spray Schedule Management APIs
  getSpraySchedules: (params) => api.get('/farms/spray-schedules/', { params }),
  createSpraySchedule: (data) => api.post('/farms/spray-schedules/', data),
  getSpraySchedule: (id) => api.get(`/farms/spray-schedules/${id}/`),
  updateSpraySchedule: (id, data) => api.put(`/farms/spray-schedules/${id}/`, data),
  deleteSpraySchedule: (id) => api.delete(`/farms/spray-schedules/${id}/`),
  getSprayScheduleAnalytics: (params) => api.get('/farms/spray-schedules/analytics/', { params }),
  
  // Expenditure Management APIs
  getExpenditures: (params) => api.get('/farms/expenditures/', { params }),
  createExpenditure: (data) => api.post('/farms/expenditures/', data),
  getExpenditure: (id) => api.get(`/farms/expenditures/${id}/`),
  updateExpenditure: (id, data) => api.put(`/farms/expenditures/${id}/`, data),
  deleteExpenditure: (id) => api.delete(`/farms/expenditures/${id}/`),
  getExpenditureAnalytics: (params) => api.get('/farms/expenditures/analytics/', { params }),
  
  // Sale Management APIs
  getSales: (params) => api.get('/farms/sales/', { params }),
  createSale: (data) => api.post('/farms/sales/', data),
  getSale: (id) => api.get(`/farms/sales/${id}/`),
  updateSale: (id, data) => api.put(`/farms/sales/${id}/`, data),
  deleteSale: (id) => api.delete(`/farms/sales/${id}/`),
  getSaleAnalytics: (params) => api.get('/farms/sales/analytics/', { params }),
};

export default api;