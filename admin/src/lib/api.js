import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Session lives in an HttpOnly cookie (set by /api/auth/login), so the axios
// instance uses withCredentials:true — no token is stored in localStorage.
// A 401 response (missing/expired/invalid session) redirects to /login below.

// Simple error interceptor for development
api.interceptors.response.use(
  (response) => {
    // Unwrap the v1 ApiResponse envelope ({ status, message, data }) so callers
    // keep receiving raw payloads, while legacy unwrapped routes pass through.
    if (
      response.data &&
      typeof response.data === 'object' &&
      response.data.status === 'success' &&
      'data' in response.data
    ) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // 401 Unauthorized — session cookie missing/expired/invalid
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Request interceptor to add userId for user mode
api.interceptors.request.use(
  (config) => {
    const accessMode = localStorage.getItem('accessMode');
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (accessMode === 'user' && currentUserId) {
      // Add userId to query params or headers
      config.params = {
        ...config.params,
        userId: currentUserId
      };
      config.headers['X-User-Id'] = currentUserId;
      config.headers['X-Access-Mode'] = 'user';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API Clients
export const clientsApi = {
  getAll: () => api.get('/clients'),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// API Modules
export const modulesApi = {
  getAll: () => api.get('/modules'),
  getByCategory: () => api.get('/modules/by-category'),
  getById: (id) => api.get(`/modules/${id}`),
  create: (data) => api.post('/modules', data),
  update: (id, data) => api.put(`/modules/${id}`, data),
  delete: (id) => api.delete(`/modules/${id}`),
};

// API Licenses
export const licensesApi = {
  getAll: () => api.get('/licenses'),
  getById: (id) => api.get(`/licenses/${id}`),
  create: (data) => api.post('/licenses', data),
  adminCreate: (data) => api.post('/licenses/admin-create', data),
  update: (id, data) => api.put(`/licenses/${id}`, data),
  delete: (id) => api.delete(`/licenses/${id}`),
  generateFile: (id, machineId) => api.post(`/licenses/${id}/generate-file`, { machineId }),
  regenerate: (id) => api.post(`/licenses/${id}/regenerate`),
  activate: (id, data) => api.post(`/licenses/${id}/activate`, data),
  deactivate: (id, data) => api.post(`/licenses/${id}/deactivate`, data),
  validate: (id, data) => api.post(`/licenses/${id}/validate`, data),
  suspend: (id, data) => api.post(`/licenses/${id}/suspend`, data),
  resume: (id) => api.post(`/licenses/${id}/resume`),
  revoke: (id, data) => api.post(`/licenses/${id}/revoke`, data),
  renew: (id, data) => api.post(`/licenses/${id}/renew`, data),
  extend: (id, data) => api.post(`/licenses/${id}/extend`, data),
  transfer: (id, data) => api.post(`/licenses/${id}/transfer`, data),
  resetBinding: (id, data) => api.post(`/licenses/${id}/reset-binding`, data),
  getHistory: (id) => api.get(`/licenses/${id}/history`),
};

// API Users
export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats'),
  getPermissions: () => api.get('/users/permissions'),
  updatePermissions: (id, permissions) => api.put(`/users/${id}/permissions`, { permissions }),
};

// API USB
export const usbApi = {
  getDrives: () => api.get('/usb/drives'),
  writeLicense: (data) => api.post('/usb/write-license', data),
  verifyLicense: (drivePath) => api.get(`/usb/verify-license/${encodeURIComponent(drivePath)}`),
};

// API POS
export const posApi = {
  generate: (data) => api.post('/pos/generate', data),
  build: (data) => api.post('/pos/build', data),
  getTemplates: () => api.get('/pos/templates'),
  getSectors: () => api.get('/pos/sectors'),
  getBuildStatus: (licenseId) => api.get(`/pos/build-status/${licenseId}`),
  cleanupBuild: (licenseId) => api.delete(`/pos/cleanup/${licenseId}`),
};

// API BI Uploads
export const biUploadsApi = {
  getAll: (params) => api.get('/bi-uploads', { params }),
  getById: (id) => api.get(`/bi-uploads/${id}`),
  getLogs: (id) => api.get(`/bi-uploads/${id}/logs`),
  getSummary: (id) => api.get(`/bi-uploads/${id}/summary`),
  getClients: () => api.get('/bi-uploads/clients/list'),
  upload: (formData, onProgress) => api.post('/bi-uploads', formData, {
    headers: { 'Content-Type': null },
    onUploadProgress: onProgress,
  }),
  // Wizard endpoints
  validate: (id) => api.post(`/bi-uploads/${id}/validate`),
  getValidationReport: (id) => api.get(`/bi-uploads/${id}/validation-report`),
  getRawPreview: (id, params) => api.get(`/bi-uploads/${id}/raw-preview`, { params }),
  prepare: (id) => api.post(`/bi-uploads/${id}/prepare`),
  getTransformationPreview: (id, params) => api.get(`/bi-uploads/${id}/transformation-preview`, { params }),
  correct: (id, payload) => api.post(`/bi-uploads/${id}/correct`, payload),
  confirmLoad: (id) => api.post(`/bi-uploads/${id}/confirm-load`),
  getReport: (id) => api.get(`/bi-uploads/${id}/report`),
};

// API BI Dashboards
export const biDashboardsApi = {
  list: (params) => api.get('/bi/dashboards', { params }),
  getById: (id) => api.get(`/bi/dashboards/${id}`),
  generateFromUpload: (uploadId) => api.post('/bi/dashboards/generate-from-upload', { uploadId }),
};

export default api;

