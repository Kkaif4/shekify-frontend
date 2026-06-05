import { Preferences } from "@capacitor/preferences";

export class SecureTokenStorage {
  private static readonly KEYS = {
    ACCESS_TOKEN: "auth_access_token",
    REFRESH_TOKEN: "auth_refresh_token",
  };

  /**
   * Save access and refresh tokens to Preferences (encrypted by the OS at rest on mobile devices)
   */
  static async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Preferences.set({
      key: this.KEYS.ACCESS_TOKEN,
      value: accessToken,
    });
    await Preferences.set({
      key: this.KEYS.REFRESH_TOKEN,
      value: refreshToken,
    });
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({
        key: this.KEYS.ACCESS_TOKEN,
      });
      return value || null;
    } catch {
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({
        key: this.KEYS.REFRESH_TOKEN,
      });
      return value || null;
    } catch {
      return null;
    }
  }

  static async clearTokens(): Promise<void> {
    await Preferences.remove({ key: this.KEYS.ACCESS_TOKEN });
    await Preferences.remove({ key: this.KEYS.REFRESH_TOKEN });
  }
}
