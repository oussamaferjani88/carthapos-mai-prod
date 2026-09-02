import axios from 'axios';
import { getToken, getAuthUser, getAuthClient } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

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
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // AccessMode testing override — only active when explicitly set via URL params.
    const accessMode = localStorage.getItem('accessMode');
    const currentUserId = localStorage.getItem('currentUserId');
    if (accessMode === 'user' && currentUserId) {
      config.params = { ...config.params, userId: currentUserId };
      config.headers['X-User-Id'] = currentUserId;
      config.headers['X-Access-Mode'] = 'user';
    } else {
      // Fall back to the authenticated client's real id for legacy endpoints.
      const authClient = getAuthClient();
      const authUser = getAuthUser();
      const identityId = authClient?.id || authUser?.id;
      if (identityId) {
        config.headers['X-User-Id'] = identityId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const clientsApi = {
  getAll: () => api.get('/clients'),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const modulesApi = {
  getAll: () => api.get('/modules'),
  getByCategory: () => api.get('/modules/by-category'),
  getById: (id: string) => api.get(`/modules/${id}`),
  create: (data: any) => api.post('/modules', data),
  update: (id: string, data: any) => api.put(`/modules/${id}`, data),
  delete: (id: string) => api.delete(`/modules/${id}`),
};

export const licensesApi = {
  getAll: () => api.get('/licenses'),
  getById: (id: string) => api.get(`/licenses/${id}`),
  create: (data: any) => api.post('/licenses', data),
  adminCreate: (data: any) => api.post('/licenses/admin-create', data),
  update: (id: string, data: any) => api.put(`/licenses/${id}`, data),
  delete: (id: string) => api.delete(`/licenses/${id}`),
  generateFile: (id: string, machineId?: string) => api.post(`/licenses/${id}/generate-file`, { machineId }),
};

export const usbApi = {
  getDrives: () => api.get('/usb/drives'),
  writeLicense: (data: any) => api.post('/usb/write-license', data),
  verifyLicense: (drivePath: string) => api.get(`/usb/verify-license/${encodeURIComponent(drivePath)}`),
};

export const posApi = {
  generate: (data: any) => api.post('/pos/generate', data),
  build: (data: any) => api.post('/pos/build', data),
  getTemplates: () => api.get('/pos/templates'),
  getSectors: () => api.get('/pos/sectors'),
  getBuildStatus: (licenseId: string) => api.get(`/pos/build-status/${licenseId}`),
  cleanupBuild: (licenseId: string) => api.delete(`/pos/cleanup/${licenseId}`),
};

export default api;
