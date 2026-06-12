import axios, { AxiosError } from "axios";

export const api = axios.create({ baseURL: "" });

const RT_KEY = "__rt";

// Access token: memory only (short-lived, never persisted)
// Refresh token: sessionStorage so it survives Fast Refresh module re-evaluation
let _accessToken: string | null = null;
let _refreshToken: string | null =
  typeof window !== "undefined" ? sessionStorage.getItem(RT_KEY) : null;

export const setTokens = (access: string, refresh: string) => {
  _accessToken = access;
  _refreshToken = refresh;
  if (typeof window !== "undefined") sessionStorage.setItem(RT_KEY, refresh);
};
export const clearTokens = () => {
  _accessToken = null;
  _refreshToken = null;
  if (typeof window !== "undefined") sessionStorage.removeItem(RT_KEY);
};
export const getAccessToken = () => _accessToken;

// Deduplicated refresh — concurrent 401s share one call
let _refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = axios
    .post<{ accessToken: string; refreshToken: string }>(
      "/api/auth/refresh",
      {},
      { headers: { "x-refresh-token": _refreshToken ?? "" } }
    )
    .then((res) => {
      setTokens(res.data.accessToken, res.data.refreshToken);
      return res.data.accessToken;
    })
    .finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && _refreshToken) {
      original._retry = true;
      try {
        const newToken = await doRefresh();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(error);
  }
);
