"use client";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { Loader2, Music } from "lucide-react";

function HomeContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-primary flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20 mb-4 animate-pulse">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-brand-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
          Connecting to Shekify...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return <Login />;
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}
