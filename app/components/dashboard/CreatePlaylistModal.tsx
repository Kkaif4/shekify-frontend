"use client";

import React from "react";
import { FolderPlus } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export function CreatePlaylistModal() {
  const {
    newPlaylistName,
    setNewPlaylistName,
    handleCreatePlaylist,
    setShowCreateModal,
  } = useDashboard();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl glass-panel p-6 shadow-2xl border border-brand-border animate-scale-in">
        <div className="flex items-center gap-2 mb-4 text-brand-accent">
          <FolderPlus className="w-5 h-5" />
          <h3 className="text-lg font-bold text-white">Create Playlist</h3>
        </div>
        <form onSubmit={handleCreatePlaylist} className="space-y-4">
          <input
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Coding Beats..."
            className="w-full bg-brand-bg-primary border border-brand-border hover:border-brand-text-secondary/30 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent px-4 py-3 text-sm rounded-xl text-white placeholder-brand-text-secondary/40 transition-colors"
            autoFocus
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setNewPlaylistName("");
              }}
              className="px-4 py-2 text-xs font-semibold text-brand-text-secondary hover:text-white hover:bg-brand-border/30 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg transition-colors shadow-lg active:scale-98 cursor-pointer disabled:opacity-40"
              disabled={!newPlaylistName.trim()}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
