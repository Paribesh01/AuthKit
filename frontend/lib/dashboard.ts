import { api } from "./api";

export interface Application {
  id: string;
  name: string;
  publishableKey: string;
  secretKey?: string;
  allowedOrigins: string[];
  webhookUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { users: number };
}

export interface AppUser {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  banned: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  _count?: { sessions: number };
}

// Applications
export async function listApplications(): Promise<Application[]> {
  const res = await api.get("/api/dashboard/applications");
  return res.data.applications;
}

export async function createApplication(name: string): Promise<Application> {
  const res = await api.post("/api/dashboard/applications", { name });
  return res.data.application;
}

export async function getApplication(appId: string): Promise<Application> {
  const res = await api.get(`/api/dashboard/applications/${appId}`);
  return res.data.application;
}

export async function updateApplication(
  appId: string,
  data: Partial<Pick<Application, "name" | "allowedOrigins" | "webhookUrl">>
): Promise<Application> {
  const res = await api.patch(`/api/dashboard/applications/${appId}`, data);
  return res.data.application;
}

export async function deleteApplication(appId: string): Promise<void> {
  await api.delete(`/api/dashboard/applications/${appId}`);
}

export async function rotateSecretKey(appId: string): Promise<string> {
  const res = await api.post(
    `/api/dashboard/applications/${appId}/rotate-key`
  );
  return res.data.secretKey;
}

// Users
export async function listUsers(
  appId: string,
  page = 1,
  limit = 20
): Promise<{ users: AppUser[]; total: number }> {
  const res = await api.get(
    `/api/dashboard/applications/${appId}/users?page=${page}&limit=${limit}`
  );
  return res.data;
}

export async function banUser(appId: string, userId: string) {
  await api.post(`/api/dashboard/applications/${appId}/users/${userId}/ban`);
}

export async function unbanUser(appId: string, userId: string) {
  await api.post(`/api/dashboard/applications/${appId}/users/${userId}/unban`);
}

export async function deleteUser(appId: string, userId: string) {
  await api.delete(`/api/dashboard/applications/${appId}/users/${userId}`);
}
