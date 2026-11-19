import axios from 'axios';

// Use same-origin `/api` so the request goes back to whatever host served the
// page (dev machine IP, prod domain, or the WebView host). In dev this hits
// Vite's proxy which forwards to VITE_BACKEND_URL. Hardcoding `localhost:7169`
// breaks every non-desktop client (WebView on phone, LAN access, etc.) because
// `localhost` resolves to the client device, not the dev machine.
const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add Authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // A responseType:'blob' request (the Excel export) gets its ERROR body as a
    // Blob too, so callers reading error.response.data.message would show
    // "undefined". Turn it back into JSON before anyone looks at it.
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Not JSON — leave the blob alone.
      }
    }

    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      // Session expired — clear storage and return to login page
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
