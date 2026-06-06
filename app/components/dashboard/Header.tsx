"use client";

import React from "react";
import { useDashboard } from "./DashboardContext";
import { Menu, Music } from "lucide-react";

export const Header: React.FC = () => {
  const {
    user,
    syncQueueSize,
    setIsSidebarOpen,
  } = useDashboard();

  return (
    <header className="lg:hidden flex items-center justify-between p-4 bg-brand-bg-secondary border-b border-brand-border z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-brand-text-secondary hover:text-white rounded-lg hover:bg-brand-border/30 transition-colors"
          title="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
            Shekify
            {syncQueueSize > 0 && (
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-text-secondary font-medium truncate max-w-[100px]">
          @{user?.username}
        </span>
      </div>
    </header>
  );
};
