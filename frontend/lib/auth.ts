import { api, setAccessToken, clearAccessToken } from "./api";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
  emailVerified: boolean;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const res = await api.post("/api/auth/register", data);
  setAccessToken(res.data.accessToken);
  return res.data.user as User;
}

export async function login(email: string, password: string) {
  const res = await api.post("/api/auth/login", { email, password });
  setAccessToken(res.data.accessToken);
  return res.data.user as User;
}

export async function logout() {
  await api.post("/api/auth/logout");
  clearAccessToken();
}

export async function getMe(): Promise<User> {
  const res = await api.get("/api/users/me");
  return res.data.user;
}

export async function refreshToken() {
  const res = await api.post("/api/auth/refresh");
  setAccessToken(res.data.accessToken);
}
