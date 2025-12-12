import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const backendPort = 5000;

// Prefer VITE_API_BASE_URL but also support legacy VITE_API_URL; trim trailing slashes
const resolvedProdBaseURL =
  (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, '') ||
  (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '') ||
  'https://mikeaiforge-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? `http://localhost:${backendPort}/api` : resolvedProdBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Allow longer time for cold starts (e.g., Render free tier)
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${resolvedProdBaseURL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/#/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
