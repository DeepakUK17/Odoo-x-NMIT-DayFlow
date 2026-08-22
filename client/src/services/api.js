import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dayflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dayflow_token');
      localStorage.removeItem('dayflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  me: () => api.get('/auth/me'),
};

// ─── Employees ──────────────────────────────────────────────────────────────
export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  update: (id, data) => api.put(`/employees/${id}`, data),
  create: (data) => api.post('/employees', data),
  getDepartments: () => api.get('/employees/meta/departments'),
};

// ─── Attendance ─────────────────────────────────────────────────────────────
export const attendanceAPI = {
  checkIn: () => api.post('/attendance/check-in'),
  checkOut: () => api.post('/attendance/check-out'),
  getToday: () => api.get('/attendance/today'),
  getMy: () => api.get('/attendance/my'),
  getAll: (params) => api.get('/attendance/all', { params }),
  getIntelligence: () => api.get('/attendance/intelligence'),
};

// ─── Leave ──────────────────────────────────────────────────────────────────
export const leaveAPI = {
  getTypes: () => api.get('/leave/types'),
  getBalance: () => api.get('/leave/balance'),
  getMyRequests: () => api.get('/leave/my-requests'),
  getAll: (params) => api.get('/leave/all', { params }),
  apply: (data) => api.post('/leave/apply', data),
  approve: (id, data) => api.patch(`/leave/${id}/approve`, data),
  reject: (id, data) => api.patch(`/leave/${id}/reject`, data),
};

// ─── Payroll ────────────────────────────────────────────────────────────────
export const payrollAPI = {
  getMy: () => api.get('/payroll/my'),
  getAll: (params) => api.get('/payroll/all', { params }),
  getByEmployee: (id) => api.get(`/payroll/${id}`),
  update: (id, data) => api.put(`/payroll/${id}`, data),
};

// ─── Analytics ──────────────────────────────────────────────────────────────
export const analyticsAPI = {
  hrSummary: () => api.get('/analytics/hr-summary'),
  attendanceTrend: () => api.get('/analytics/attendance-trend'),
  leaveDistribution: () => api.get('/analytics/leave-distribution'),
  departmentAbsenteeism: () => api.get('/analytics/department-absenteeism'),
  employeeStats: () => api.get('/analytics/employee-stats'),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all/mark'),
};

// ─── Audit ──────────────────────────────────────────────────────────────────
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
};

// ─── AI ─────────────────────────────────────────────────────────────────────
export const aiAPI = {
  query: (query) => api.post('/ai/query', { query }),
  leaveAssist: (input) => api.post('/ai/leave-assist', { input }),
  proactiveInsights: () => api.get('/ai/proactive-insights'),
};

export default api;
