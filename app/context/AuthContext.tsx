"use client";

import { apiClient } from "@/lib/apiClient";
import { SecureTokenStorage } from "@/lib/secureStorage";
import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  role: string;
}

interface DecodedToken {
  id: string;
  username: string;
  role: string;
  exp: number;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, refreshToken: string, expiresIn: number) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      const storedToken = await SecureTokenStorage.getAccessToken();
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (storedToken) {
        try {
          const decoded = decodeToken(storedToken);
          if (decoded) {
            setToken(storedToken);
            setUser({
              id: decoded.id,
              username: decoded.username,
              role: decoded.role,
            });

            // Schedule background refresh based on actual expiry
            const now = Math.floor(Date.now() / 1000);
            const remaining = decoded.exp - now;
            if (remaining > 60) {
              apiClient.scheduleRefresh(remaining);
            } else {
              // Near expiry on load, refresh immediately
              const renewed = await apiClient.refreshAccessToken();
              if (renewed) {
                const renewedDecoded = decodeToken(renewed);
                if (renewedDecoded) {
                  setToken(renewed);
                  setUser({
                    id: renewedDecoded.id,
                    username: renewedDecoded.username,
                    role: renewedDecoded.role,
                  });
                }
              }
            }
          } else {
            await SecureTokenStorage.clearTokens();
          }
        } catch (e) {
          await SecureTokenStorage.clearTokens();
        }
      }
      setIsLoading(false);
    }
    loadStoredAuth();
  }, []);

  // Listen to background refresh token updates
  useEffect(() => {
    apiClient.setOnTokenRefreshed((newToken) => {
      setToken(newToken);
      const decoded = decodeToken(newToken);
      if (decoded) {
        setUser({
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        });
      }
    });
    return () => {
      apiClient.setOnTokenRefreshed(() => {});
    };
  }, []);

  const login = (newToken: string, refreshToken: string, expiresIn: number) => {
    SecureTokenStorage.saveTokens(newToken, refreshToken).then(() => {
      const decoded = decodeToken(newToken);
      if (decoded) {
        setToken(newToken);
        setUser({
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        });
        apiClient.scheduleRefresh(expiresIn);
      }
    });
  };

  const logout = () => {
    // 1. Retrieve refresh token and call logout revocation in the background
    SecureTokenStorage.getRefreshToken().then((refToken) => {
      apiClient.request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: refToken }),
      }).catch((err) => {
        console.error("Failed to revoke session on server:", err);
      });
    });
    // 2. Perform local cleanup synchronously for state
    SecureTokenStorage.clearTokens().then(() => {
      apiClient.clearRefreshTimeout();
      setToken(null);
      setUser(null);
    });
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode token:", e);
    return null;
  }
}
