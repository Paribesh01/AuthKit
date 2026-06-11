import { api, setAccessToken, clearAccessToken } from "./api";

export interface Developer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<Developer> {
  const res = await api.post("/api/auth/register", data);
  setAccessToken(res.data.accessToken);
  return res.data.developer;
}

export async function login(email: string, password: string): Promise<Developer> {
  const res = await api.post("/api/auth/login", { email, password });
  setAccessToken(res.data.accessToken);
  return res.data.developer;
}

export async function logout() {
  await api.post("/api/auth/logout");
  clearAccessToken();
}

export async function getMe(): Promise<Developer> {
  const res = await api.get("/api/auth/me");
  return res.data.developer;
}

export async function refreshToken() {
  const res = await api.post("/api/auth/refresh");
  setAccessToken(res.data.accessToken);
}
