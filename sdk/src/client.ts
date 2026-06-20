import type { AuthConfig, AuthUser, SignInParams, SignUpParams } from "./types";

export class AuthClient {
  private config: AuthConfig;
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _user: AuthUser | null = null;
  private _refreshPromise: Promise<string> | null = null;
  private readonly RT_KEY: string;

  constructor(config: AuthConfig) {
    this.config = config;
    // Namespace by publishable key so multiple apps on the same domain don't conflict
    this.RT_KEY = `__authkit_rt_${config.publishableKey.slice(-8)}`;
    if (typeof window !== "undefined") {
      this._refreshToken = this._store().getItem(this.RT_KEY);
    }
  }

  private _store(): Storage {
    return this.config.persistSession !== false ? localStorage : sessionStorage;
  }

  private _saveRefreshToken(token: string) {
    this._refreshToken = token;
    if (typeof window !== "undefined") this._store().setItem(this.RT_KEY, token);
  }

  private _saveAccessCookie(token: string) {
    if (typeof document === "undefined") return;
    // 15 min matches the access token TTL; not httpOnly so the SDK client can manage it
    document.cookie = `__authkit_at=${encodeURIComponent(token)}; max-age=900; path=/; SameSite=Lax`;
  }

  private _clearAccessCookie() {
    if (typeof document === "undefined") return;
    document.cookie = "__authkit_at=; max-age=0; path=/";
  }

  private _clearStorage() {
    this._refreshToken = null;
    this._accessToken = null;
    this._user = null;
    if (typeof window !== "undefined") this._store().removeItem(this.RT_KEY);
    this._clearAccessCookie();
  }

  private async _request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/v1${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-publishable-key": this.config.publishableKey,
      ...(options.headers as Record<string, string>),
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data as { error?: string }).error || "Request failed") as Error & {
        status: number;
        data: unknown;
      };
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data as T;
  }

  private _doRefresh(): Promise<string> {
    if (this._refreshPromise) return this._refreshPromise;
    if (!this._refreshToken) return Promise.reject(new Error("No refresh token"));

    this._refreshPromise = this._request<{ accessToken: string; refreshToken: string }>(
      "/refresh",
      {
        method: "POST",
        headers: { "x-refresh-token": this._refreshToken },
      }
    )
      .then((data) => {
        this._accessToken = data.accessToken;
        this._saveRefreshToken(data.refreshToken);
        this._saveAccessCookie(data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        // Refresh failed — session is truly expired, clear everything
        this._clearStorage();
        throw err;
      })
      .finally(() => {
        this._refreshPromise = null;
      });

    return this._refreshPromise;
  }

  private async _authedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Proactively refresh if we have a refresh token but no access token
    if (!this._accessToken && this._refreshToken) {
      await this._doRefresh();
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...(this._accessToken ? { Authorization: `Bearer ${this._accessToken}` } : {}),
    };

    try {
      return await this._request<T>(path, { ...options, headers });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 401 && this._refreshToken) {
        // Access token expired — refresh once and retry
        const newToken = await this._doRefresh();
        return this._request<T>(path, {
          ...options,
          headers: { ...(options.headers as Record<string, string>), Authorization: `Bearer ${newToken}` },
        });
      }
      throw err;
    }
  }

  async signUp(params: SignUpParams): Promise<AuthUser> {
    const data = await this._request<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>("/sign-up", { method: "POST", body: JSON.stringify(params) });

    this._accessToken = data.accessToken;
    this._saveRefreshToken(data.refreshToken);
    this._saveAccessCookie(data.accessToken);
    this._user = data.user;
    return data.user;
  }

  async signIn(params: SignInParams): Promise<AuthUser> {
    const data = await this._request<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>("/sign-in", { method: "POST", body: JSON.stringify(params) });

    this._accessToken = data.accessToken;
    this._saveRefreshToken(data.refreshToken);
    this._saveAccessCookie(data.accessToken);
    this._user = data.user;
    return data.user;
  }

  async signOut(): Promise<void> {
    try {
      await this._request("/sign-out", {
        method: "POST",
        headers: this._refreshToken ? { "x-refresh-token": this._refreshToken } : {},
      });
    } finally {
      this._clearStorage();
    }
  }

  async getUser(): Promise<AuthUser | null> {
    if (!this._refreshToken) return null;
    try {
      const data = await this._authedRequest<{ user: AuthUser }>("/me");
      this._user = data.user;
      return data.user;
    } catch {
      this._clearStorage();
      return null;
    }
  }

  /**
   * Redirect the browser to begin an OAuth sign-in flow.
   * Call this when the user clicks "Sign in with Google/GitHub".
   *
   * @param provider "google" | "github"
   * @param redirectUrl The URL in YOUR app where the user lands after OAuth
   *   (e.g. "https://myapp.com/auth/callback"). The SDK reads tokens there
   *   via handleOAuthCallback().
   */
  signInWithOAuth(provider: "google" | "github", options: { redirectUrl: string }) {
    const url = new URL(`${this.config.baseUrl}/v1/oauth/${provider}`);
    url.searchParams.set("publishable_key", this.config.publishableKey);
    url.searchParams.set("redirect_url", options.redirectUrl);
    window.location.href = url.toString();
  }

  /**
   * Call this on your OAuth callback page to capture the tokens returned
   * by the auth service and sign the user in.
   * Returns the user if successful, null otherwise.
   */
  async handleOAuthCallback(): Promise<AuthUser | null> {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (!accessToken || !refreshToken) return null;

    this._accessToken = accessToken;
    this._saveRefreshToken(refreshToken);
    this._saveAccessCookie(accessToken);

    // Clean tokens out of the URL (security: don't leave them in history)
    const clean = new URL(window.location.href);
    clean.searchParams.delete("accessToken");
    clean.searchParams.delete("refreshToken");
    window.history.replaceState({}, "", clean.toString());

    return this.getUser();
  }

  async updateMetadata(publicMetadata: Record<string, unknown>): Promise<AuthUser> {
    const data = await this._authedRequest<{ user: AuthUser }>("/me/metadata", {
      method: "PATCH",
      body: JSON.stringify({ publicMetadata }),
    });
    this._user = { ...this._user, ...data.user } as AuthUser;
    return this._user!;
  }

  async forgotPassword(email: string, redirectUrl?: string): Promise<void> {
    await this._request("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, redirectUrl }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this._request("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  getCachedUser(): AuthUser | null {
    return this._user;
  }

  isSignedIn(): boolean {
    return !!this._refreshToken;
  }
}
