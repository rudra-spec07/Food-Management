import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const TOKEN_KEY = 'food_mgmt_access_token';

export const tokenStorage = {
  getToken: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (err) {
      console.error('Failed to save access token:', err);
    }
  },
  removeToken: (): void => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      console.error('Failed to remove access token:', err);
    }
  },
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Event subscriber for global 401 handling
type UnauthorizedCallback = () => void;
let onUnauthorizedCallback: UnauthorizedCallback | null = null;

export const setUnauthorizedListener = (callback: UnauthorizedCallback) => {
  onUnauthorizedCallback = callback;
};

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to normalize errors and handle 401 revocation
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      tokenStorage.removeToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    const backendError = error.response?.data?.error;
    const message = backendError?.message || error.message || 'An unexpected error occurred';
    const code = backendError?.code || 'UNKNOWN_ERROR';

    return Promise.reject({
      statusCode: error.response?.status || 500,
      code,
      message,
    });
  }
);
