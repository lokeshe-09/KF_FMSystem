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
  getFarms: () => api.get('/farms/'),
  createFarm: (farmData) => api.post('/farms/create/', farmData),
  getFarm: (id) => api.get(`/farms/${id}/`),
  updateFarm: (id, farmData) => api.put(`/farms/${id}/`, farmData),
  deleteFarm: (id) => api.delete(`/farms/${id}/`),
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
  
  // Worker Issue Management APIs
  getWorkerIssues: (params) => api.get('/farms/worker-issues/', { params }),
  createWorkerIssue: (data) => api.post('/farms/worker-issues/', data),
  getWorkerIssue: (id) => api.get(`/farms/worker-issues/${id}/`),
  updateWorkerIssue: (id, data) => api.put(`/farms/worker-issues/${id}/`, data),
  deleteWorkerIssue: (id) => api.delete(`/farms/worker-issues/${id}/`),
  
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