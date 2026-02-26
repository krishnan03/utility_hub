import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  withCredentials: true,
});

// Request interceptor — ensure credentials are sent
api.interceptors.request.use(
  (config) => {
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — extract data, normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with a non-2xx status
      const data = error.response.data;
      const normalized = {
        success: false,
        status: error.response.status,
        error: data?.error || {
          code: 'UNKNOWN_ERROR',
          message: data?.message || error.message || 'An unexpected error occurred',
        },
      };
      return Promise.reject(normalized);
    }

    if (error.request) {
      // Request was made but no response received
      return Promise.reject({
        success: false,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error — please check your connection',
        },
      });
    }

    // Something else happened
    return Promise.reject({
      success: false,
      status: 0,
      error: {
        code: 'REQUEST_ERROR',
        message: error.message || 'Failed to send request',
      },
    });
  },
);

export default api;
