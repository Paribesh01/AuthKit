import { api } from "./api";

export interface Application {
  id: string;
  name: string;
  publishableKey: string;
  secretKey?: string;
  allowedOrigins: string[];
  webhookUrl?: string | null;
  webhookSecret?: string | null;
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
  publicMetadata?: Record<string, unknown> | null;
  lastSignInAt: string | null;
  createdAt: string;
  _count?: { sessions: number };
}

export interface OAuthProvider {
  provider: "google" | "github";
  enabled: boolean;
  id: string | null;
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
  const res = await api.post(`/api/dashboard/applications/${appId}/rotate-key`);
  return res.data.secretKey;
}

export async function rotateWebhookSecret(appId: string): Promise<string> {
  const res = await api.post(`/api/dashboard/applications/${appId}/rotate-webhook-secret`);
  return res.data.webhookSecret;
}

// OAuth providers
export async function listOAuthProviders(appId: string): Promise<OAuthProvider[]> {
  const res = await api.get(`/api/dashboard/applications/${appId}/oauth-providers`);
  return res.data.providers;
}

export async function upsertOAuthProvider(
  appId: string,
  data: { provider: string; enabled: boolean }
): Promise<OAuthProvider> {
  const res = await api.post(`/api/dashboard/applications/${appId}/oauth-providers`, data);
  return res.data.provider;
}

// Stats & Events
export interface AppStats {
  totalUsers: number;
  activeSessions: number;
  eventsToday: number;
  signInsLast30Days: number;
  newUsersLast30Days: number;
}

export interface AppEvent {
  id: string;
  eventType: string;
  actorId: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getAppStats(appId: string): Promise<AppStats> {
  const res = await api.get(`/api/dashboard/applications/${appId}/stats`);
  return res.data;
}

export async function listEvents(
  appId: string,
  page = 1,
  eventType?: string
): Promise<{ events: AppEvent[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (eventType) params.set("eventType", eventType);
  const res = await api.get(`/api/dashboard/applications/${appId}/events?${params}`);
  return res.data;
}

// Users
export async function createUser(
  appId: string,
  data: { email?: string; password?: string; firstName?: string; lastName?: string; username?: string }
): Promise<AppUser> {
  const res = await api.post(`/api/dashboard/applications/${appId}/users`, data);
  return res.data.user;
}

export async function listUsers(
  appId: string,
  page = 1,
  limit = 20,
  search?: string
): Promise<{ users: AppUser[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  const res = await api.get(`/api/dashboard/applications/${appId}/users?${params}`);
  return res.data;
}

export interface AppSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface AppSettings {
  id: string;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireEmailVerification: boolean;
  allowSignups: boolean;
  sessionDurationHours: number;
  maxSessionsPerUser: number;
}

export interface ChartPoint {
  date: string;
  count: number;
}

export async function getActivityChart(appId: string): Promise<ChartPoint[]> {
  const res = await api.get(`/api/dashboard/applications/${appId}/chart`);
  return res.data.chart;
}

export async function getAppSettingsData(appId: string): Promise<AppSettings> {
  const res = await api.get(`/api/dashboard/applications/${appId}/settings`);
  return res.data.settings;
}

export async function updateAppSettings(appId: string, data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await api.patch(`/api/dashboard/applications/${appId}/settings`, data);
  return res.data.settings;
}

export async function listUserSessions(appId: string, userId: string): Promise<AppSession[]> {
  const res = await api.get(`/api/dashboard/applications/${appId}/users/${userId}/sessions`);
  return res.data.sessions;
}

export async function revokeOneSession(appId: string, sessionId: string): Promise<void> {
  await api.delete(`/api/dashboard/applications/${appId}/sessions/${sessionId}`);
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
