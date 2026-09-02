/**
 * API Utility for CarthaPos Admin Panel
 * Handles all HTTP requests. The session lives in an HttpOnly cookie, so
 * requests use credentials: 'include' and no token is stored on the client.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get default headers
 */
const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

/**
 * Handle API errors
 */
const handleError = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    // Session expired or invalid — redirect to login
    if (response.status === 401 && window.location.pathname !== '/login') {
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
      // Don't set Content-Type for FormData - browser will set it with boundary

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      return handleError(response);
    } catch (error) {
      console.error(`API POST ${endpoint} (FormData) failed:`, error);
      throw error;
    }
  },

  /**
   * Login (no auth required — establishes the HttpOnly cookie session)
   */
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
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
