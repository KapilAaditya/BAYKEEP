import axios from 'axios';

// Create pre-configured Axios instance
const api = axios.create({
  // Use relative '/api' in production (Render), and localhost for local development
  baseURL: import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT token to headers if logged in
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('baykeep_token');
    if (token) { 
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global errors like expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returns 401 (token expired or invalid), clear stored auth
    if (error.response && error.response.status === 401) {
      const isAuthEndpoint = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('baykeep_token');
        localStorage.removeItem('baykeep_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;