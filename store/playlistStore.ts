import { create } from "zustand";

export interface Song {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: number | null;
  duration_s?: number | null;
  syncStatus?: "synced" | "pending" | "failed";
}

export interface Playlist {
  id: string;
  name: string;
  created_at?: string;
  songs: Song[];
  syncStatus?: "synced" | "pending" | "failed";
}

interface PlaylistStoreState {
  playlists: Playlist[];
  activePlaylistDetails: Playlist | null;

  // Setters
  setPlaylists: (playlists: Playlist[]) => void;
  setActivePlaylistDetails: (playlist: Playlist | null) => void;

  // Optimistic updates
  createPlaylistOptimistic: (tempId: string, name: string) => void;
  addTrackOptimistic: (playlistId: string, song: Song) => void;
  removeTrackOptimistic: (playlistId: string, songId: string) => void;

  // Sync handlers
  markPlaylistSynced: (playlistId: string, actualId?: string, name?: string) => void;
  markPlaylistFailed: (playlistId: string) => void;
}

export const usePlaylistStore = create<PlaylistStoreState>((set) => ({
  playlists: [],
  activePlaylistDetails: null,

  setPlaylists: (playlists) => set({ playlists }),
  setActivePlaylistDetails: (activePlaylistDetails) => set({ activePlaylistDetails }),

  createPlaylistOptimistic: (tempId, name) => set((state) => {
    const newPlaylist: Playlist = {
      id: tempId,
      name,
      songs: [],
      syncStatus: "pending",
    };
    return {
      playlists: [newPlaylist, ...state.playlists],
    };
  }),

  addTrackOptimistic: (playlistId, song) => set((state) => {
    // 1. Update list of playlists
    const updatedPlaylists = state.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          songs: [...pl.songs, { ...song, syncStatus: "pending" as const }],
          syncStatus: "pending" as const,
        };
      }
      return pl;
    });

    // 2. Update active playlist details if matches
    let updatedActive = state.activePlaylistDetails;
    if (updatedActive && updatedActive.id === playlistId) {
      updatedActive = {
        ...updatedActive,
        songs: [...updatedActive.songs, { ...song, syncStatus: "pending" as const }],
        syncStatus: "pending" as const,
      };
    }

    return {
      playlists: updatedPlaylists,
      activePlaylistDetails: updatedActive,
    };
  }),

  removeTrackOptimistic: (playlistId, songId) => set((state) => {
    // 1. Update list of playlists
    const updatedPlaylists = state.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          songs: pl.songs.filter((s) => s.id !== songId),
          syncStatus: "pending" as const,
        };
      }
      return pl;
    });

    // 2. Update active playlist details if matches
    let updatedActive = state.activePlaylistDetails;
    if (updatedActive && updatedActive.id === playlistId) {
      updatedActive = {
        ...updatedActive,
        songs: updatedActive.songs.filter((s) => s.id !== songId),
        syncStatus: "pending" as const,
      };
    }

    return {
      playlists: updatedPlaylists,
      activePlaylistDetails: updatedActive,
    };
  }),

  markPlaylistSynced: (playlistId, actualId, name) => set((state) => {
    // Map temporary ID to actual ID if provided
    const updatedPlaylists = state.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          id: actualId || pl.id,
          name: name || pl.name,
          syncStatus: "synced" as const,
          songs: pl.songs.map((s) => ({ ...s, syncStatus: "synced" as const })),
        };
      }
      return pl;
    });

    let updatedActive = state.activePlaylistDetails;
    if (updatedActive && updatedActive.id === playlistId) {
      updatedActive = {
        ...updatedActive,
        id: actualId || updatedActive.id,
        name: name || updatedActive.name,
        syncStatus: "synced" as const,
        songs: updatedActive.songs.map((s) => ({ ...s, syncStatus: "synced" as const })),
      };
    }

    return {
      playlists: updatedPlaylists,
      activePlaylistDetails: updatedActive,
    };
  }),

  markPlaylistFailed: (playlistId) => set((state) => {
    const updatedPlaylists = state.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          syncStatus: "failed" as const,
          songs: pl.songs.map((s) => {
            if (s.syncStatus === "pending") {
              return { ...s, syncStatus: "failed" as const };
            }
            return s;
          }),
        };
      }
      return pl;
    });

    let updatedActive = state.activePlaylistDetails;
    if (updatedActive && updatedActive.id === playlistId) {
      updatedActive = {
        ...updatedActive,
        syncStatus: "failed" as const,
        songs: updatedActive.songs.map((s) => {
          if (s.syncStatus === "pending") {
            return { ...s, syncStatus: "failed" as const };
          }
          return s;
        }),
      };
    }

    return {
      playlists: updatedPlaylists,
      activePlaylistDetails: updatedActive,
    };
  }),
}));
