import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// JWT AUTHENTICATION - DISABLED FOR DEVELOPMENT
// TODO: Re-enable before production deployment
// ============================================================================

// Request interceptor - Add JWT token to all requests (DISABLED)
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('pos_admin_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Response interceptor - Handle authentication errors (DISABLED)
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error('API Error:', error);
//     
//     // Handle 401 Unauthorized - token expired or invalid
//     if (error.response?.status === 401) {
//       const errorCode = error.response?.data?.code;
//       
//       if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
//         // Clear auth data
//         localStorage.removeItem('pos_admin_token');
//         localStorage.removeItem('pos_admin_user');
//         
//         // Redirect to login if not already there
//         if (window.location.pathname !== '/login') {
//           window.location.href = '/login';
//         }
//       }
//     }
//     
//     return Promise.reject(error);
//   }
// );

// Simple error interceptor for development
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  update: (id, data) => api.put(`/licenses/${id}`, data),
  delete: (id) => api.delete(`/licenses/${id}`),
  generateFile: (id, machineId) => api.post(`/licenses/${id}/generate-file`, { machineId }),
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

export default api;

