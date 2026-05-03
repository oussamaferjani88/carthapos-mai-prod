/**
 * API Utility for CarthaPos Admin Panel
 * Handles all HTTP requests with automatic JWT token injection
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get JWT token from localStorage
 */
const getToken = () => {
  return localStorage.getItem('pos_admin_token');
};

/**
 * Get default headers with JWT token
 */
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Handle API errors
 */
const handleError = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    
    // If token expired or invalid, clear auth and redirect to login
    if (response.status === 401 && (error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN')) {
      localStorage.removeItem('pos_admin_token');
      localStorage.removeItem('pos_admin_user');
      window.location.href = '/login';
    }
    
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * API methods
 */
const api = {
  /**
   * GET request
   */
  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API GET ${endpoint} failed:`, error);
      throw error;
    }
  },

  /**
   * POST request
   */
  post: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API POST ${endpoint} failed:`, error);
      throw error;
    }
  },

  /**
   * PUT request
   */
  put: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API PUT ${endpoint} failed:`, error);
      throw error;
    }
  },

  /**
   * DELETE request
   */
  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API DELETE ${endpoint} failed:`, error);
      throw error;
    }
  },

  /**
   * POST request with FormData (for file uploads)
   */
  postFormData: async (endpoint, formData) => {
    try {
      const headers = {};
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API POST ${endpoint} (FormData) failed:`, error);
      throw error;
    }
  },

  /**
   * Login (no auth required)
   */
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Invalid credentials');
      }
      
      return response.json();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }
};

export default api;
