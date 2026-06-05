"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Music, AlertCircle, Key, User, Loader2 } from "lucide-react";

import { ENV } from "../../lib/environment";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "info" | "error" | "success" }[]
  >([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${ENV.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });
      setToasts((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          message: "Login successful",
          type: "success",
        },
      ]);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.token && data.refreshToken) {
        login(data.token, data.refreshToken, data.expiresIn);
      } else {
        throw new Error("No authorization token received");
      }
    } catch (err: any) {
      console.error("Login failure:", err);
      setError(err.message || "Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-bg-primary overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/30 mb-4 animate-pulse">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Shekify
            </h1>
            <p className="text-brand-text-secondary text-sm mt-1">
              Your Local High-Fidelity Audio Streaming Portal
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-200 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-brand-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-brand-text-secondary/60" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-border hover:border-brand-text-secondary/30 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent rounded-xl text-white placeholder-brand-text-secondary/40 transition-colors"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-brand-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-brand-text-secondary/60" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-border hover:border-brand-text-secondary/30 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent rounded-xl text-white placeholder-brand-text-secondary/40 transition-colors"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-brand-accent hover:bg-brand-accent-hover active:scale-98 text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Login to Gateway"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
