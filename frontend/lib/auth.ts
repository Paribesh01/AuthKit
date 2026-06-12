import { api, setTokens, clearTokens } from "./api";

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
  setTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.developer;
}

export async function login(email: string, password: string): Promise<Developer> {
  const res = await api.post("/api/auth/login", { email, password });
  setTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.developer;
}

export async function logout() {
  await api.post("/api/auth/logout").catch(() => {});
  clearTokens();
}

export async function getMe(): Promise<Developer> {
  const res = await api.get("/api/auth/me");
  return res.data.developer;
}
