"use client";

import React from "react";
import { useDashboard } from "./DashboardContext";
import {
  Music,
  Home,
  Settings,
  Plus,
  Loader2,
  LogOut,
  X,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const {
    user,
    logout,
    isAdmin,
    syncQueueSize,
    activeView,
    setActiveView,
    activePlaylistId,
    setActivePlaylistId,
    isSidebarOpen,
    setIsSidebarOpen,
    playlists,
    playlistsLoading,
    setShowCreateModal,
  } = useDashboard();

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Navigation Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 w-64 bg-brand-bg-secondary border-r border-brand-border flex flex-col justify-between shrink-0 z-50 lg:z-20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex flex-col gap-8 overflow-y-auto flex-1">
          {/* Branding Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Shekify
                {syncQueueSize > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full animate-pulse border border-brand-accent/20">
                    Syncing ({syncQueueSize})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-brand-text-secondary hover:text-white rounded-lg hover:bg-brand-border/30 transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Default Pages Toggles */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => {
                setActiveView("home");
                setActivePlaylistId(null);
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                activeView === "home"
                  ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20"
                  : "text-brand-text-secondary hover:text-white hover:bg-brand-border/30"
              }`}
            >
              <Home className="w-4 h-4" />
              Library
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveView("admin");
                  setActivePlaylistId(null);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  activeView === "admin"
                    ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20"
                    : "text-brand-text-secondary hover:text-white hover:bg-brand-border/30"
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin Console
              </button>
            )}
          </nav>

          {/* Playlists listing */}
          <div className="flex flex-col gap-4 pt-4 border-t border-brand-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">
                Playlists
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 rounded-lg hover:bg-brand-border/50 text-brand-text-secondary hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {playlistsLoading ? (
              <div className="flex items-center gap-2 text-xs text-brand-text-secondary py-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                Loading...
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-xs text-brand-text-secondary/50 italic py-2">
                No playlists created.
              </div>
            ) : (
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[200px]">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      setActiveView("playlist");
                      setIsSidebarOpen(false);
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-sm truncate font-medium transition-all ${
                      activeView === "playlist" && activePlaylistId === pl.id
                        ? "text-brand-accent bg-brand-accent/10 border-l-2 border-brand-accent pl-2"
                        : "text-brand-text-secondary hover:text-white hover:bg-brand-border/20"
                    }`}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Signout info footer */}
        <div className="p-4 border-t border-brand-border bg-brand-bg-primary/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs text-brand-text-secondary uppercase font-semibold">
                Logged in as
              </span>
              <span className="text-sm font-bold text-white truncate">
                @{user?.username}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                setIsSidebarOpen(false);
              }}
              className="p-2 text-brand-text-secondary hover:text-red-400 hover:bg-brand-border/40 rounded-xl transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-brand-text-secondary/60 mt-1 pt-2 border-t border-brand-border/40 font-mono">
            <span>Version: v1.0.0</span>
            <a
              href="https://shekify.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
