import { ENV } from "./environment";
import { SecureTokenStorage } from "./secureStorage";

class ApiClient {
  private refreshTimeout: NodeJS.Timeout | null = null;
  private onTokenRefreshedCallback: ((token: string) => void) | null = null;

  setOnTokenRefreshed(callback: (token: string) => void) {
    this.onTokenRefreshedCallback = callback;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await SecureTokenStorage.getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    // Ensure endpoint starts with a slash
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${ENV.API_URL}${path}`;

    let response = await fetch(url, { ...options, headers });

    // If unauthorized, attempt to refresh the token and retry once
    if (response.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
      const renewedToken = await this.refreshAccessToken();
      if (renewedToken) {
        const newHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${renewedToken}`,
        };
        response = await fetch(url, { ...options, headers: newHeaders });
      }
    }

    return response;
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await SecureTokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${ENV.API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        // saveTokens expects (accessToken, refreshToken)
        await SecureTokenStorage.saveTokens(data.token, data.refreshToken);
        this.scheduleRefresh(data.expiresIn);
        if (this.onTokenRefreshedCallback) {
          this.onTokenRefreshedCallback(data.token);
        }
        return data.token;
      } else {
        // Revoked or expired refresh token
        await SecureTokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/?reason=session_expired";
        }
      }
    } catch (e) {
      console.error("Access token refresh failed:", e);
    }
    return null;
  }

  scheduleRefresh(expiresInSeconds: number) {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
    // Refresh 60 seconds before actual expiry (default access tokens are 15m/900s, refresh happens at 14m/840s)
    const waitTime = (expiresInSeconds - 60) * 1000;
    if (waitTime <= 0) return;

    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, waitTime);
  }

  clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
}

export const apiClient = new ApiClient();
