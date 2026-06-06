"use client";

import { DashboardProvider, useDashboard } from "./dashboard/DashboardContext";
import AdminConsole from "./AdminConsole";
import { Sidebar } from "./dashboard/Sidebar";
import { Header } from "./dashboard/Header";
import { PlayerFooter } from "./dashboard/PlayerFooter";
import { LibraryView } from "./dashboard/LibraryView";
import { PlaylistView } from "./dashboard/PlaylistView";
import { CreatePlaylistModal } from "./dashboard/CreatePlaylistModal";
import { Music, AlertCircle, Check } from "lucide-react";

function DashboardContent() {
  const {
    toasts,
    isSidebarOpen,
    setIsSidebarOpen,
    activeView,
    activePlaylistDetails,
    showCreateModal,
    songsPage,
    songsTotalPages,
    songsLoading,
    songsLoadingMore,
    debouncedSearch,
    fetchSongs,
    activePlaylistId,
    playlistSongsPage,
    playlistSongsTotalPages,
    playlistSongsLoadingMore,
    fetchPlaylistDetails,
  } = useDashboard();

  return (
    <div className="flex flex-col h-screen bg-brand-bg-primary text-white select-none">
      {/* Toast notifications portal */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl flex items-center gap-3 shadow-2xl border transition-all animate-fade-in ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100"
                : t.type === "error"
                  ? "bg-red-950/90 border-red-500/30 text-red-100"
                  : "bg-brand-bg-secondary/90 border-brand-border text-white"
            }`}
          >
            {t.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : t.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Music className="w-5 h-5 text-brand-accent shrink-0" />
            )}
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-brand-bg-primary overflow-hidden relative">
          {/* Mobile Top Bar */}
          <Header />

          {/* Scrollable container for views */}
          <div
            className="flex-1 overflow-y-auto p-4 md:p-8"
            onScroll={(e) => {
              const bottom =
                e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
                e.currentTarget.clientHeight + 100;
              if (bottom) {
                if (
                  activeView === "home" &&
                  songsPage < songsTotalPages &&
                  !songsLoading &&
                  !songsLoadingMore
                ) {
                  fetchSongs(debouncedSearch, songsPage + 1);
                } else if (
                  activeView === "playlist" &&
                  activePlaylistId &&
                  playlistSongsPage < playlistSongsTotalPages &&
                  !playlistSongsLoadingMore
                ) {
                  fetchPlaylistDetails(activePlaylistId, playlistSongsPage + 1);
                }
              }
            }}
          >
            {activeView === "home" && <LibraryView />}

            {activeView === "playlist" && activePlaylistDetails && (
              <PlaylistView />
            )}

            {activeView === "admin" && <AdminConsole />}
          </div>
        </main>
      </div>

      {/* Bottom Persistent Audio Player Bar */}
      <PlayerFooter />

      {/* Playlist Creation Modal */}
      {showCreateModal && <CreatePlaylistModal />}
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
