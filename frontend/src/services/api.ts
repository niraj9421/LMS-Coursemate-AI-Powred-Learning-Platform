import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

// ─── Token Storage Keys ───────────────────────────────────────────────────────
export const TOKEN_KEYS = {
  ACCESS: 'lms_access_token',
  REFRESH: 'lms_refresh_token',
} as const;

// ─── Token Helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(TOKEN_KEYS.ACCESS),
  getRefresh: (): string | null => localStorage.getItem(TOKEN_KEYS.REFRESH),
  setAccess: (token: string): void => localStorage.setItem(TOKEN_KEYS.ACCESS, token),
  setRefresh: (token: string): void => localStorage.setItem(TOKEN_KEYS.REFRESH, token),
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(TOKEN_KEYS.ACCESS, access);
    localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 60_000,  // 60s — AI calls can take 30-40s
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — Inject JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, remove the default Content-Type so the browser
    // sets multipart/form-data with the correct boundary automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─── Token Refresh State ──────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh calls when several requests 401 at once.
// All queued requests are resolved/rejected once the refresh completes.

let isRefreshing = false;

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else if (token) {
      entry.resolve(token);
    }
  });
  failedQueue = [];
}

// ─── Response Interceptor — Auto Refresh on 401 ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors that haven't been retried yet,
    // and skip the refresh endpoint itself to avoid infinite loops.
    const isUnauthorized = error.response?.status === 401;
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh-token');
    const alreadyRetried = originalRequest._retry === true;

    if (!isUnauthorized || isRefreshEndpoint || alreadyRetried) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err: unknown) => Promise.reject(err));
    }

    // Mark as retried and start the refresh
    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStorage.getRefresh();

    if (!refreshToken) {
      // No refresh token — clear storage and redirect to login
      tokenStorage.clear();
      processQueue(new Error('No refresh token'), null);
      isRefreshing = false;
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post<{
        data: { accessToken: string; refreshToken: string };
      }>(
        `${import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}/auth/refresh-token`,
        { refreshToken },
      );

      const { accessToken, refreshToken: newRefreshToken } = data.data;
      tokenStorage.setTokens(accessToken, newRefreshToken);

      // Update the Authorization header on the original request and retry
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);

      return api(originalRequest);
    } catch (refreshError: unknown) {
      // Refresh failed — clear tokens and send user to login
      tokenStorage.clear();
      processQueue(refreshError, null);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
