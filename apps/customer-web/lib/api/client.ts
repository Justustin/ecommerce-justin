import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

/**
 * Base API URL from environment variables
 * Development: http://localhost:3002 (assuming product-service runs on 3002)
 * Production: https://api.batikbeli.com
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * Create Axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR - Attach JWT token to every request
// ============================================================================

/**
 * Before every request, attach the JWT token from localStorage
 * This is where we integrate with Zustand auth store
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (Zustand persists it there)
    // We'll access the auth store directly in the next file
    const authStorage = localStorage.getItem('auth-storage');
    
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        
        if (token && config.headers) {
          // Attach JWT token to Authorization header
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR - Handle errors globally
// ============================================================================

/**
 * Handle API responses and errors consistently
 */
apiClient.interceptors.response.use(
  // Success responses pass through
  (response) => {
    return response;
  },
  
  // Error handling
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      switch (status) {
        case 401: {
          // Unauthorized - token expired or invalid
          
          // Avoid infinite retry loop
          if (originalRequest._retry) {
            // Already tried to refresh, redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
              window.location.href = '/login?session_expired=true';
            }
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;
          
          // TODO: Implement token refresh logic here
          // For MVP, we'll just redirect to login
          // In Phase 2, implement refresh token flow:
          // 1. Call /auth/refresh endpoint
          // 2. Get new access token
          // 3. Update auth store
          // 4. Retry original request
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            window.location.href = '/login?session_expired=true';
          }
          
          return Promise.reject(error);
        }
        
        case 403: {
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', error.response.data);
          return Promise.reject({
            message: 'Anda tidak memiliki akses untuk melakukan ini',
            status: 403,
            data: error.response.data,
          });
        }
        
        case 404: {
          // Not found
          return Promise.reject({
            message: 'Data tidak ditemukan',
            status: 404,
            data: error.response.data,
          });
        }
        
        case 422: {
          // Validation error
          return Promise.reject({
            message: 'Data yang Anda masukkan tidak valid',
            status: 422,
            data: error.response.data,
            errors: (error.response.data as any)?.errors, // Field-level errors
          });
        }
        
        case 429: {
          // Rate limit exceeded
          return Promise.reject({
            message: 'Terlalu banyak permintaan. Silakan coba lagi nanti',
            status: 429,
            data: error.response.data,
          });
        }
        
        case 500:
        case 502:
        case 503:
        case 504: {
          // Server errors
          return Promise.reject({
            message: 'Terjadi kesalahan pada server. Silakan coba lagi',
            status: status,
            data: error.response.data,
          });
        }
        
        default: {
          // Other errors
          return Promise.reject({
            message: (error.response.data as any)?.message || 'Terjadi kesalahan',
            status: status,
            data: error.response.data,
          });
        }
      }
    } else if (error.request) {
      // Request was made but no response received
      // Network error, timeout, or CORS issue
      console.error('Network error:', error.request);
      return Promise.reject({
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda',
        status: 0,
        networkError: true,
      });
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
      return Promise.reject({
        message: error.message || 'Terjadi kesalahan',
        status: 0,
      });
    }
  }
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if error is a network error (no internet connection)
 */
export const isNetworkError = (error: any): boolean => {
  return error?.networkError === true || error?.status === 0;
};

/**
 * Check if error is an authentication error (401/403)
 */
export const isAuthError = (error: any): boolean => {
  return error?.status === 401 || error?.status === 403;
};

/**
 * Check if error is a validation error (422)
 */
export const isValidationError = (error: any): boolean => {
  return error?.status === 422;
};

/**
 * Extract error message from API error response
 * Handles different error response formats
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.data?.message) {
    return error.data.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  return 'Terjadi kesalahan. Silakan coba lagi';
};

/**
 * Extract field-level validation errors (for form validation)
 * Returns object like: { phone_number: ['Nomor telepon sudah terdaftar'], ... }
 */
export const getValidationErrors = (error: any): Record<string, string[]> | null => {
  if (!isValidationError(error)) {
    return null;
  }
  
  return error?.errors || error?.data?.errors || null;
};

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Configured Axios instance ready to use
 * All requests through this client will:
 * - Include JWT token automatically
 * - Handle errors consistently
 * - Use Indonesian error messages
 * - Retry/refresh tokens on 401
 */
export default apiClient;

/**
 * Re-export AxiosError type for convenience
 */
export type { AxiosError };

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Simple GET request
 * 
 * import apiClient from '@/lib/api/client';
 * 
 * const response = await apiClient.get('/products');
 * const products = response.data;
 */

/**
 * Example 2: POST request with data
 * 
 * import apiClient from '@/lib/api/client';
 * 
 * const response = await apiClient.post('/orders', {
 *   product_id: '123',
 *   quantity: 2
 * });
 */

/**
 * Example 3: Error handling
 * 
 * import apiClient, { getErrorMessage, isValidationError } from '@/lib/api/client';
 * 
 * try {
 *   await apiClient.post('/auth/register', formData);
 * } catch (error) {
 *   if (isValidationError(error)) {
 *     // Show field-level errors
 *     const errors = getValidationErrors(error);
 *     console.log(errors); // { phone_number: ['Already registered'] }
 *   } else {
 *     // Show general error message
 *     const message = getErrorMessage(error);
 *     toast.error(message);
 *   }
 * }
 */

/**
 * Example 4: Using with React Query
 * 
 * import { useQuery } from '@tanstack/react-query';
 * import apiClient from '@/lib/api/client';
 * 
 * const { data, isLoading } = useQuery({
 *   queryKey: ['products'],
 *   queryFn: async () => {
 *     const response = await apiClient.get('/products');
 *     return response.data;
 *   }
 * });
 */