"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import AdminConsole from "./AdminConsole";
import {
  Music,
  Home,
  Search,
  Settings,
  Plus,
  Trash2,
  FolderMinus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  PlusCircle,
  Download,
  LogOut,
  FolderPlus,
  Loader2,
  Check,
  SearchCode,
  Music2,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  year: number | null;
  duration_s: number | null;
}

interface Playlist {
  id: string;
  name: string;
  created_at: string;
  songs?: { song_id: string }[];
}

import { ENV } from "../../lib/environment";
import { apiClient } from "../../lib/apiClient";
import DOMPurify from "dompurify";

const API_BASE = ENV.API_URL;

// Helper component: fetches cover images as blobs to bypass ngrok interstitial
function CoverImage({
  songId,
  className,
  fallbackClass,
}: {
  songId: string;
  className?: string;
  fallbackClass?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let revoke: string | null = null;
    apiClient.fetchBlobUrl(`/songs/${songId}/cover`).then((url) => {
      if (url) {
        revoke = url;
        setSrc(url);
      } else {
        setFailed(true);
      }
    });
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [songId]);

  if (failed || !src) {
    return (
      <div
        className={
          fallbackClass || "text-[9px] text-indigo-500 font-bold uppercase"
        }
      >
        MP3
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={className || "w-full h-full object-cover"}
      onError={() => setFailed(true)}
    />
  );
}

export default function Dashboard() {
  const { token, user, logout, isAdmin } = useAuth();

  // Navigation & View State
  const [activeView, setActiveView] = useState<
    "home" | "search" | "playlist" | "admin"
  >("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylistDetails, setActivePlaylistDetails] = useState<{
    id: string;
    name: string;
    songs: Song[];
  } | null>(null);

  // Data State
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsPage, setSongsPage] = useState(1);
  const [songsTotalPages, setSongsTotalPages] = useState(1);
  const [songsLoadingMore, setSongsLoadingMore] = useState(false);

  // Playlist songs pagination states
  const [playlistSongsPage, setPlaylistSongsPage] = useState(1);
  const [playlistSongsTotalPages, setPlaylistSongsTotalPages] = useState(1);
  const [playlistSongsLoadingMore, setPlaylistSongsLoadingMore] =
    useState(false);

  // Autoplay state
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Keyboard navigation highlight state
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(
    null,
  );

  // Ingestion Widget State
  const [ingestSong, setIngestSong] = useState("");
  const [ingestSinger, setIngestSinger] = useState("");
  const [ingestYear, setIngestYear] = useState("");
  const [ingestAlbum, setIngestAlbum] = useState("");
  const [ingestStatus, setIngestStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

  // Playlist Creation Modal / Input
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistActionLoading, setPlaylistActionLoading] = useState(false);

  // Add to Playlist Dropdown active state
  const [activeDropdownSongId, setActiveDropdownSongId] = useState<
    string | null
  >(null);

  // Audio Engine State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // Queues and History for player controls
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [playbackHistory, setPlaybackHistory] = useState<string[]>([]);

  // Notifications / Toast
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "info" | "error" | "success" }[]
  >([]);

  const addToast = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // ── 1. Fetching Initial Data ──────────────────────────────────────

  const fetchSongs = async (search = "", page = 1) => {
    if (page === 1) {
      setSongsLoading(true);
    } else {
      setSongsLoadingMore(true);
    }

    try {
      const endpoint = search.trim()
        ? `/songs?search=${encodeURIComponent(search.trim())}&page=${page}&limit=50`
        : `/songs?page=${page}&limit=50`;

      const res = await apiClient.request(endpoint);
      const result = await res.json();
      if (res.ok) {
        if (page === 1) {
          setSongs(result.data);
        } else {
          setSongs((prev) => [...prev, ...result.data]);
        }
        setSongsPage(result.page);
        setSongsTotalPages(result.totalPages);
      } else {
        addToast(result.error || "Failed to load library songs", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch songs from library", "error");
    } finally {
      if (page === 1) {
        setSongsLoading(false);
      } else {
        setSongsLoadingMore(false);
      }
    }
  };

  const fetchPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const res = await apiClient.request("/playlists");
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data);
      } else {
        addToast(data.error || "Failed to load playlists", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error fetching playlists", "error");
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const fetchPlaylistDetails = async (playlistId: string, page = 1) => {
    if (page === 1) {
      // initial load
    } else {
      setPlaylistSongsLoadingMore(true);
    }
    try {
      const res = await apiClient.request(
        `/playlists/${playlistId}?page=${page}&limit=50`,
      );
      const data = await res.json();
      if (res.ok) {
        if (page === 1) {
          setActivePlaylistDetails(data);
        } else {
          setActivePlaylistDetails((prev) => {
            if (!prev || prev.id !== playlistId) return prev;
            const existingIds = new Set(prev.songs.map((s) => s.id));
            const newSongs = data.songs.filter(
              (s: Song) => !existingIds.has(s.id),
            );
            return {
              ...prev,
              songs: [...prev.songs, ...newSongs],
            };
          });
        }
        setPlaylistSongsPage(data.page || 1);
        setPlaylistSongsTotalPages(data.totalPages || 1);
      } else {
        addToast(data.error || "Failed to load playlist tracks", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error loading playlist details", "error");
    } finally {
      if (page > 1) {
        setPlaylistSongsLoadingMore(false);
      }
    }
  };

  // Debounced search logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (token) {
      fetchSongs(debouncedSearch, 1);
    }
  }, [debouncedSearch, token]);

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
  }, [token]);

  useEffect(() => {
    if (activeView === "playlist" && activePlaylistId) {
      fetchPlaylistDetails(activePlaylistId, 1);
    }
    setSelectedSongIndex(null);
    setIsSidebarOpen(false);
  }, [activeView, activePlaylistId]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".playlist-dropdown-trigger") ||
        target.closest(".playlist-dropdown-menu")
      ) {
        return;
      }
      setActiveDropdownSongId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // ── 2. Ingesting & Downloader Widget ─────────────────────────────

  const handleIngestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestSong.trim() || !ingestSinger.trim() || !ingestYear.trim()) {
      addToast("Song Name, Artist, and Year are required", "error");
      return;
    }

    setIngestStatus("loading");

    try {
      const res = await apiClient.request("/download", {
        method: "POST",
        body: JSON.stringify({
          songName: ingestSong.trim(),
          singer: ingestSinger.trim(),
          year: ingestYear ? parseInt(ingestYear, 10) : undefined,
          album: ingestAlbum.trim(),
        }),
      });

      if (res.status === 404) {
        setIngestStatus("idle");
        addToast(
          "We could not find the song on YouTube. Please try different keywords.",
          "error",
        );
        return;
      }

      const data = await res.json();

      if (res.status === 202) {
        setIngestStatus("success");
        addToast("Request made! It will be updated soon.", "success");

        // Clear fields
        setIngestSong("");
        setIngestSinger("");
        setIngestYear("");
        setIngestAlbum("");

        // Reset checkmark icon back to idle after 3 seconds
        setTimeout(() => {
          setIngestStatus("idle");
        }, 4000);
      } else {
        throw new Error(data.error || "Failed to make download request");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to trigger ingestion job", "error");
      setIngestStatus("idle");
    }
  };

  // ── 3. Playlist Operations ────────────────────────────────────────

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setPlaylistActionLoading(true);
    try {
      const res = await apiClient.request("/playlists", {
        method: "POST",
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        addToast(`Playlist "${data.name}" created!`, "success");
        setNewPlaylistName("");
        setShowCreateModal(false);
        fetchPlaylists();
      } else {
        addToast(data.error || "Failed to create playlist", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error creating playlist", "error");
    } finally {
      setPlaylistActionLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      const res = await apiClient.request(`/playlists/${playlistId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        addToast("Playlist deleted successfully", "success");
        fetchPlaylists();
        setActiveView("home");
        setActivePlaylistId(null);
        setActivePlaylistDetails(null);
      } else {
        addToast(data.error || "Failed to delete playlist", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error deleting playlist", "error");
    }
  };

  const handleAddSongToPlaylist = async (
    playlistId: string,
    songId: string,
  ) => {
    try {
      const res = await apiClient.request(`/playlists/${playlistId}/songs`, {
        method: "POST",
        body: JSON.stringify({ songId }),
      });
      const data = await res.json();

      if (res.ok) {
        const pl = playlists.find((p) => p.id === playlistId);
        addToast(`Added track to "${pl?.name || "playlist"}"`, "success");
        setActiveDropdownSongId(null);
        if (activeView === "playlist" && activePlaylistId === playlistId) {
          fetchPlaylistDetails(playlistId, 1);
        }
      } else {
        addToast(data.error || "Failed to add song", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error adding song to playlist", "error");
    }
  };

  const handleToggleSongInPlaylist = async (
    playlistId: string,
    songId: string,
    shouldAdd: boolean,
  ) => {
    try {
      if (shouldAdd) {
        const res = await apiClient.request(`/playlists/${playlistId}/songs`, {
          method: "POST",
          body: JSON.stringify({ songId }),
        });
        const data = await res.json();

        if (res.ok) {
          const pl = playlists.find((p) => p.id === playlistId);
          addToast(`Added track to "${pl?.name || "playlist"}"`, "success");

          setPlaylists((prev) =>
            prev.map((p) => {
              if (p.id === playlistId) {
                const existingSongs = p.songs || [];
                if (!existingSongs.some((s) => s.song_id === songId)) {
                  return {
                    ...p,
                    songs: [...existingSongs, { song_id: songId }],
                  };
                }
              }
              return p;
            }),
          );

          if (activeView === "playlist" && activePlaylistId === playlistId) {
            fetchPlaylistDetails(playlistId, 1);
          }
        } else {
          addToast(data.error || "Failed to add song", "error");
        }
      } else {
        const res = await apiClient.request(
          `/playlists/${playlistId}/songs/${songId}`,
          {
            method: "DELETE",
          },
        );
        const data = await res.json();

        if (res.ok) {
          const pl = playlists.find((p) => p.id === playlistId);
          addToast(`Removed track from "${pl?.name || "playlist"}"`, "success");

          setPlaylists((prev) =>
            prev.map((p) => {
              if (p.id === playlistId) {
                const existingSongs = p.songs || [];
                return {
                  ...p,
                  songs: existingSongs.filter((s) => s.song_id !== songId),
                };
              }
              return p;
            }),
          );

          if (activeView === "playlist" && activePlaylistId === playlistId) {
            fetchPlaylistDetails(playlistId, 1);
          }
        } else {
          addToast(data.error || "Failed to remove song", "error");
        }
      }
    } catch (err) {
      console.error(err);
      addToast("Error updating playlist", "error");
    }
  };

  const handleRemoveSongFromPlaylist = async (
    playlistId: string,
    songId: string,
  ) => {
    try {
      const res = await apiClient.request(
        `/playlists/${playlistId}/songs/${songId}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (res.ok) {
        addToast("Song removed from playlist", "success");
        fetchPlaylistDetails(playlistId, 1);
      } else {
        addToast(data.error || "Failed to remove song", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error removing song", "error");
    }
  };

  // Refs to prevent stale closures in audio event listeners and keyboard shortcuts
  const handleSkipNextRef = useRef<() => void>(() => {});
  const handleSkipPreviousRef = useRef<() => void>(() => {});
  const handleSkipForward5Ref = useRef<() => void>(() => {});
  const handleSkipBackward5Ref = useRef<() => void>(() => {});
  const isAutoPlayRef = useRef(isAutoPlay);

  useEffect(() => {
    handleSkipNextRef.current = handleSkipNext;
    handleSkipPreviousRef.current = handleSkipPrevious;
    handleSkipForward5Ref.current = handleSkipForward5;
    handleSkipBackward5Ref.current = handleSkipBackward5;
    isAutoPlayRef.current = isAutoPlay;
  });

  // ── 4. Media Audio Engine Setup & Handlers ────────────────────────

  // Initialize Audio Object
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      // Auto-advance play next track if autoplay is enabled
      if (isAutoPlayRef.current) {
        handleSkipNextRef.current();
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = (e: any) => {
      if (
        !audio.src ||
        audio.src === window.location.href ||
        audio.src.endsWith("/")
      ) {
        return;
      }

      const mediaError = audio.error;
      let errorMessage = "Track temporarily unavailable";

      if (mediaError) {
        // Handle specific HTML5 MediaError codes
        switch (mediaError.code) {
          case 1: // MEDIA_ERR_ABORTED
            // Playback aborted by the user or load transition, usually not a fatal error
            console.debug(
              "Playback request aborted (normal operation when shifting tracks rapidly).",
            );
            return;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage =
              "Network connection failed while streaming the audio track.";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = "Failed to decode the audio file format.";
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage =
              "The audio track URL could not be loaded or is in an unsupported format.";
            break;
          default:
            if (mediaError.message) {
              errorMessage = `Playback Error: ${mediaError.message}`;
            }
            break;
        }

        console.error("Native Audio Element Error:", {
          code: mediaError.code,
          message: mediaError.message || "No error message provided",
          src: audio.src,
        });
      } else {
        console.error("Native Audio Element Exception Event:", e);
      }

      setIsPlaying(false);
      addToast(errorMessage, "error");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      // Clean up on component unmount
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
      audio.src = "";
      audio.load();
    };
  }, []);

  // Update native volume when React volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Media Session Controls update with XSS sanitization
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !currentSong
    )
      return;

    const sanitize = (text: string) =>
      DOMPurify.sanitize(text || "", { ALLOWED_TAGS: [] });

    const songTitle = sanitize(currentSong.title);
    const songArtist = sanitize(currentSong.artist || "Unknown Artist");
    const songAlbum = sanitize(currentSong.album || "Unknown Album");

    const coverUrl = `${API_BASE}/songs/${currentSong.id}/cover?token=${token}&ngrok-skip-browser-warning=69420`;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: songTitle,
      artist: songArtist,
      album: songAlbum,
      artwork: [
        {
          src: coverUrl,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (handleSkipPreviousRef.current) handleSkipPreviousRef.current();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (handleSkipNextRef.current) handleSkipNextRef.current();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      if (audioRef.current) {
        const offset = details.seekOffset || 5;
        audioRef.current.currentTime = Math.max(
          audioRef.current.currentTime - offset,
          0,
        );
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      if (audioRef.current) {
        const offset = details.seekOffset || 5;
        audioRef.current.currentTime = Math.min(
          audioRef.current.currentTime + offset,
          audioRef.current.duration || 0,
        );
      }
    });
  }, [currentSong, token]);

  // Play a song and configure the active queue context
  const handlePlaySong = (song: Song, contextSongs: Song[]) => {
    if (!audioRef.current) return;

    // Save previous song in history before loading new one
    if (currentSong) {
      setPlaybackHistory((prev) => {
        // Keep unique entries, remove if duplicate to make backtracking neat
        const filtered = prev.filter((id) => id !== currentSong.id);
        return [...filtered, currentSong.id];
      });
    }

    // NFR-2.1: Sever existing connection to release memory
    audioRef.current.pause();
    if (audioRef.current.src.startsWith("blob:")) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    audioRef.current.src = "";
    audioRef.current.load();

    setCurrentSong(song);

    // Set streaming URL with authentication token and ngrok bypass parameter
    const streamUrl = `${API_BASE}/stream/${song.id}?token=${token}&ngrok-skip-browser-warning=69420`;
    audioRef.current.src = streamUrl;
    audioRef.current.load();

    // Configure playback queues
    setOriginalQueue(contextSongs);
    let newQueue = [...contextSongs];
    if (isShuffle) {
      newQueue = shuffleArray(contextSongs);
      // Ensure the clicked song is placed at index 0 in shuffling
      const filtered = newQueue.filter((s) => s.id !== song.id);
      newQueue = [song, ...filtered];
    }
    setPlaybackQueue(newQueue);

    const idx = newQueue.findIndex((s) => s.id === song.id);
    setCurrentQueueIndex(idx !== -1 ? idx : 0);

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        if (err.name === "AbortError") {
          console.debug(
            "Play request was aborted (normal when changing tracks rapidly).",
          );
          return;
        }
        console.error("Play failed:", err);
        setIsPlaying(false);
        addToast("Track temporarily unavailable", "error");
      });
  };

  // Helper to retrieve currently visible list of songs for keyboard navigation
  const getDisplayedSongs = (): Song[] => {
    if (activeView === "home") {
      return songs;
    }
    if (activeView === "playlist" && activePlaylistDetails) {
      return activePlaylistDetails.songs;
    }
    return [];
  };

  // Helper to scroll the navigated item into view automatically
  const scrollIndexIntoView = (index: number) => {
    setTimeout(() => {
      const row = document.querySelector(`tr[data-index="${index}"]`);
      if (row) {
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 50);
  };

  // Handle keyboard mappings and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in inputs/editable elements
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        const isEditable = activeEl.getAttribute("contenteditable") === "true";
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          isEditable
        ) {
          return;
        }
      }

      const displayed = getDisplayedSongs();

      switch (e.key) {
        case "ArrowRight":
          if (e.ctrlKey) {
            e.preventDefault();
            handleSkipNextRef.current();
          } else {
            e.preventDefault();
            handleSkipForward5Ref.current();
          }
          break;
        case "ArrowLeft":
          if (e.ctrlKey) {
            e.preventDefault();
            handleSkipPreviousRef.current();
          } else {
            e.preventDefault();
            handleSkipBackward5Ref.current();
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (displayed.length > 0) {
            setSelectedSongIndex((prev) => {
              if (prev === null) return 0;
              const nextIndex = Math.min(prev + 1, displayed.length - 1);
              scrollIndexIntoView(nextIndex);
              return nextIndex;
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (displayed.length > 0) {
            setSelectedSongIndex((prev) => {
              if (prev === null) return 0;
              const nextIndex = Math.max(prev - 1, 0);
              scrollIndexIntoView(nextIndex);
              return nextIndex;
            });
          }
          break;
        case "Enter":
          if (selectedSongIndex !== null) {
            const songToPlay = displayed[selectedSongIndex];
            if (songToPlay) {
              e.preventDefault();
              handlePlaySong(songToPlay, displayed);
            }
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSongIndex, songs, activePlaylistDetails, activeView]);

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err.name === "AbortError") {
            console.debug(
              "Play request was aborted (normal when pausing quickly).",
            );
            return;
          }
          console.error("Resume playback failed:", err);
          addToast("Unable to resume playback", "error");
        });
    }
  };

  // Timeline seeking manipulation
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip forward 5 seconds
  const handleSkipForward5 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      audioRef.current.currentTime + 5,
      duration,
    );
  };

  // Rewind backward 5 seconds
  const handleSkipBackward5 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      audioRef.current.currentTime - 5,
      0,
    );
  };

  // Play next track in active queue
  const handleSkipNext = () => {
    if (playbackQueue.length === 0 || currentQueueIndex === -1) return;

    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < playbackQueue.length) {
      const nextSong = playbackQueue[nextIdx];
      // Save current in history
      if (currentSong) {
        setPlaybackHistory((prev) => [
          ...prev.filter((id) => id !== currentSong.id),
          currentSong.id,
        ]);
      }
      loadAndPlayFromQueue(nextSong, nextIdx);
    } else {
      // Loop back to start and play index 0
      const firstSong = playbackQueue[0];
      if (currentSong) {
        setPlaybackHistory((prev) => [
          ...prev.filter((id) => id !== currentSong.id),
          currentSong.id,
        ]);
      }
      loadAndPlayFromQueue(firstSong, 0);
    }
  };

  // Play previous track via local stack history
  const handleSkipPrevious = () => {
    if (!audioRef.current) return;

    // If track has been playing for more than 3s, reset current song instead of popping history
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (playbackHistory.length > 0) {
      const prevHistory = [...playbackHistory];
      const prevSongId = prevHistory.pop()!;
      setPlaybackHistory(prevHistory);

      // Look up song in current library/playlist context
      const songToPlay =
        playbackQueue.find((s) => s.id === prevSongId) ||
        songs.find((s) => s.id === prevSongId);

      if (songToPlay) {
        const idx = playbackQueue.findIndex((s) => s.id === songToPlay.id);
        loadAndPlayFromQueue(songToPlay, idx !== -1 ? idx : currentQueueIndex);
      }
    } else {
      // No history, reset current track
      audioRef.current.currentTime = 0;
    }
  };

  // Helper loader for skip transitions
  const loadAndPlayFromQueue = (song: Song, index: number) => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    if (audioRef.current.src.startsWith("blob:")) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    audioRef.current.src = "";
    audioRef.current.load();

    setCurrentSong(song);
    setCurrentQueueIndex(index);

    // Set streaming URL with authentication token and ngrok bypass parameter
    const streamUrl = `${API_BASE}/stream/${song.id}?token=${token}&ngrok-skip-browser-warning=69420`;
    audioRef.current.src = streamUrl;
    audioRef.current.load();

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        if (err.name === "AbortError") {
          console.debug(
            "Play request was aborted (normal when changing tracks rapidly).",
          );
          return;
        }
        console.error("Play from queue failed:", err);
        setIsPlaying(false);
        addToast("Track temporarily unavailable", "error");
      });
  };

  // Shuffle Toggle
  const toggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (originalQueue.length === 0 || !currentSong) return;

    if (nextShuffle) {
      // Shuffling active queue context using Fisher-Yates
      let shuffled = shuffleArray(originalQueue);
      // Lock current playing song at the top
      shuffled = [
        currentSong,
        ...shuffled.filter((s) => s.id !== currentSong.id),
      ];
      setPlaybackQueue(shuffled);
      setCurrentQueueIndex(0);
    } else {
      // Restore original queue order
      setPlaybackQueue(originalQueue);
      const idx = originalQueue.findIndex((s) => s.id === currentSong.id);
      setCurrentQueueIndex(idx !== -1 ? idx : 0);
    }
    addToast(
      nextShuffle ? "Shuffle Playback Enabled" : "Shuffle Playback Disabled",
      "info",
    );
  };

  // Fisher-Yates helper
  function shuffleArray(array: Song[]): Song[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Format second timestamps (e.g. 182s -> 03:02)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

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

        {/* ── COLUMN 1: Left Navigation Sidebar ────────────────────────── */}
        <aside
          className={`fixed lg:relative inset-y-0 left-0 w-64 bg-brand-bg-secondary border-r border-brand-border flex flex-col justify-between shrink-0 z-50 lg:z-20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6 flex flex-col gap-8 overflow-y-auto flex-1">
            {/* Branding Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  Shekify
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

        {/* ── MAIN CONTENT PANEL ────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-brand-bg-primary overflow-hidden relative">
          {/* Mobile Top Bar */}
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
                <span className="font-bold text-white tracking-tight">
                  Shekify
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-text-secondary font-medium truncate max-w-[100px]">
                @{user?.username}
              </span>
            </div>
          </header>

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
            {/* ── VIEW ROUTING RENDERER ──────────────────────────────────── */}
            {activeView === "home" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Global Audio Library
                    </h2>
                    <p className="text-xs text-brand-text-secondary">
                      Scan all indexed records stored in your server directory.
                    </p>
                  </div>
                  <div className="relative w-full md:max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-secondary pointer-events-none">
                      <Search className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title, artist, or album..."
                      className="w-full pl-10 pr-4 py-2 bg-brand-bg-secondary border border-brand-border hover:border-brand-text-secondary/30 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent rounded-xl text-white placeholder-brand-text-secondary/40 transition-all text-sm"
                    />
                  </div>
                </div>

                {songsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-brand-text-secondary gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
                    <span>Loading audio library...</span>
                  </div>
                ) : songs.length === 0 ? (
                  <div className="text-center py-20 bg-brand-bg-secondary/45 border border-brand-border/40 rounded-2xl p-8">
                    {searchQuery ? (
                      <>
                        <Search className="w-12 h-12 text-brand-text-secondary/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-1">
                          No matches found
                        </h3>
                        <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
                          Could not find any files matching your search filters
                          in local indexes.
                        </p>
                      </>
                    ) : (
                      <>
                        <Music2 className="w-12 h-12 text-brand-text-secondary/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-1">
                          Library Empty
                        </h3>
                        <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
                          No songs found in the audio library directory.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border/80 text-brand-text-secondary text-[10px] uppercase font-bold tracking-wider">
                          <th className="pb-3 w-12 text-center">#</th>
                          <th className="pb-3 w-14">Cover</th>
                          <th className="pb-3">Title</th>
                          <th className="pb-3 hidden sm:table-cell">Artist</th>
                          <th className="pb-3 hidden md:table-cell">Album</th>
                          <th className="pb-3 hidden lg:table-cell text-center">
                            Year
                          </th>
                          <th className="pb-3 hidden sm:table-cell text-center">
                            Duration
                          </th>
                          <th className="pb-3 text-center w-16">Add</th>
                        </tr>
                      </thead>
                      <tbody>
                        {songs.map((song, index) => {
                          const isCurrent = currentSong?.id === song.id;
                          const isSelected = selectedSongIndex === index;
                          return (
                            <tr
                              key={song.id}
                              data-index={index}
                              onClick={() => setSelectedSongIndex(index)}
                              onDoubleClick={() => handlePlaySong(song, songs)}
                              className={`group border-b border-brand-border/40 hover:bg-brand-bg-secondary/50 transition-colors text-sm cursor-pointer ${
                                isCurrent
                                  ? "text-brand-accent bg-brand-accent/5"
                                  : "text-brand-text-secondary"
                              } ${isSelected ? "ring-2 ring-brand-accent/50 bg-brand-border/15" : ""}`}
                            >
                              <td className="py-3 text-center font-medium">
                                <span className="group-hover:hidden">
                                  {index + 1}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaySong(song, songs);
                                  }}
                                  className="hidden group-hover:inline-block hover:scale-110 text-brand-accent transition-transform cursor-pointer"
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-bg-primary border border-brand-border flex items-center justify-center shrink-0">
                                  <CoverImage
                                    songId={song.id}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>
                              <td className="py-3 font-semibold text-white truncate max-w-[200px]">
                                <div>{song.title}</div>
                                <div className="text-xs text-brand-text-secondary sm:hidden font-normal mt-0.5 truncate">
                                  {song.artist || "Unknown Artist"}
                                </div>
                              </td>
                              <td className="py-3 truncate max-w-[150px] hidden sm:table-cell">
                                {song.artist || "Unknown Artist"}
                              </td>
                              <td className="py-3 truncate max-w-[150px] hidden md:table-cell">
                                {song.album || "—"}
                              </td>
                              <td className="py-3 text-center hidden lg:table-cell">
                                {song.year || "—"}
                              </td>
                              <td className="py-3 text-center hidden sm:table-cell">
                                {formatTime(song.duration_s || 0)}
                              </td>
                              <td className="py-3 text-center relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownSongId(
                                      activeDropdownSongId === song.id
                                        ? null
                                        : song.id,
                                    );
                                  }}
                                  className="playlist-dropdown-trigger p-1.5 rounded-lg hover:bg-brand-border/60 hover:text-white transition-colors cursor-pointer"
                                >
                                  <PlusCircle className="w-4 h-4 text-brand-text-secondary" />
                                </button>

                                {/* Dropdown menu overlay */}
                                {activeDropdownSongId === song.id && (
                                  <div className="playlist-dropdown-menu absolute right-0 mt-1 w-48 rounded-xl bg-brand-bg-secondary border border-brand-border shadow-2xl z-30 py-1.5 text-left text-xs text-white">
                                    <div className="px-3 py-1.5 border-b border-brand-border text-brand-text-secondary uppercase font-bold text-[9px] tracking-widest">
                                      Add to Playlist
                                    </div>
                                    {playlists.length === 0 ? (
                                      <div className="px-3 py-2 text-brand-text-secondary/50 italic">
                                        No custom playlists found
                                      </div>
                                    ) : (
                                      <div className="max-h-[160px] overflow-y-auto">
                                        {playlists.map((pl) => {
                                          const isInPlaylist =
                                            pl.songs?.some(
                                              (s) => s.song_id === song.id,
                                            ) || false;
                                          return (
                                            <label
                                              key={pl.id}
                                              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-brand-border/30 transition-colors cursor-pointer select-none text-xs"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isInPlaylist}
                                                onChange={(e) => {
                                                  handleToggleSongInPlaylist(
                                                    pl.id,
                                                    song.id,
                                                    e.target.checked,
                                                  );
                                                }}
                                                className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent bg-brand-bg-primary cursor-pointer"
                                              />
                                              <span className="truncate font-semibold text-white">
                                                {pl.name}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeView === "playlist" && activePlaylistDetails && (
              <div>
                {/* Playlist Header details card */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 pb-6 border-b border-brand-border/60">
                  <div className="w-40 h-40 rounded-2xl bg-gradient-to-tr from-brand-accent to-indigo-950 flex items-center justify-center shadow-xl shadow-brand-accent/10 border border-brand-accent/20 shrink-0">
                    <Music className="w-16 h-16 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-text-secondary">
                      PLAYLIST
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-1 mb-3">
                      {activePlaylistDetails.name}
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 text-xs text-brand-text-secondary">
                      {activePlaylistDetails.songs.length > 0 && (
                        <button
                          onClick={() => {
                            const isPlayingThisPlaylist =
                              isPlaying &&
                              playbackQueue.length ===
                                activePlaylistDetails.songs.length &&
                              playbackQueue.every(
                                (song, i) =>
                                  song.id ===
                                  activePlaylistDetails.songs[i]?.id,
                              );

                            if (isPlayingThisPlaylist) {
                              audioRef.current?.pause();
                              setIsPlaying(false);
                            } else {
                              handlePlaySong(
                                activePlaylistDetails.songs[0],
                                activePlaylistDetails.songs,
                              );
                              setIsAutoPlay(true);
                            }
                          }}
                          className="flex items-center gap-2 px-5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold rounded-full shadow-lg shadow-brand-accent/20 transition-all transform active:scale-95 cursor-pointer shrink-0"
                        >
                          {isPlaying &&
                          playbackQueue.length ===
                            activePlaylistDetails.songs.length &&
                          playbackQueue.every(
                            (song, i) =>
                              song.id === activePlaylistDetails.songs[i]?.id,
                          ) ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              Pause Playlist
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Play Playlist
                            </>
                          )}
                        </button>
                      )}
                      <div className="flex items-center gap-4">
                        <span>{activePlaylistDetails.songs.length} Tracks</span>
                        <span>•</span>
                        <button
                          onClick={() =>
                            handleDeletePlaylist(activePlaylistDetails.id)
                          }
                          className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Playlist
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Song listing in Playlist */}
                {activePlaylistDetails.songs.length === 0 ? (
                  <div className="text-center py-20 bg-brand-bg-secondary/45 border border-brand-border/40 rounded-2xl p-8">
                    <FolderMinus className="w-12 h-12 text-brand-text-secondary/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Playlist is empty
                    </h3>
                    <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
                      Go to the Library or Search and click the ➕ button to
                      append song records here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border/80 text-brand-text-secondary text-[10px] uppercase font-bold tracking-wider">
                          <th className="pb-3 w-12 text-center">#</th>
                          <th className="pb-3 w-14">Cover</th>
                          <th className="pb-3">Title</th>
                          <th className="pb-3 hidden sm:table-cell">Artist</th>
                          <th className="pb-3 hidden md:table-cell">Album</th>
                          <th className="pb-3 hidden sm:table-cell text-center">
                            Duration
                          </th>
                          <th className="pb-3 text-center w-16">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePlaylistDetails.songs.map((song, index) => {
                          const isCurrent = currentSong?.id === song.id;
                          const isSelected = selectedSongIndex === index;
                          return (
                            <tr
                              key={song.id}
                              data-index={index}
                              onClick={() => setSelectedSongIndex(index)}
                              onDoubleClick={() =>
                                handlePlaySong(
                                  song,
                                  activePlaylistDetails.songs,
                                )
                              }
                              className={`group border-b border-brand-border/40 hover:bg-brand-bg-secondary/50 transition-colors text-sm cursor-pointer ${
                                isCurrent
                                  ? "text-brand-accent bg-brand-accent/5"
                                  : "text-brand-text-secondary"
                              } ${isSelected ? "ring-2 ring-brand-accent/50 bg-brand-border/15" : ""}`}
                            >
                              <td className="py-3 text-center font-medium">
                                <span className="group-hover:hidden">
                                  {index + 1}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaySong(
                                      song,
                                      activePlaylistDetails.songs,
                                    );
                                  }}
                                  className="hidden group-hover:inline-block hover:scale-110 text-brand-accent transition-transform cursor-pointer"
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-bg-primary border border-brand-border flex items-center justify-center shrink-0">
                                  <CoverImage
                                    songId={song.id}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>
                              <td className="py-3 font-semibold text-white truncate max-w-[200px]">
                                <div>{song.title}</div>
                                <div className="text-xs text-brand-text-secondary sm:hidden font-normal mt-0.5 truncate">
                                  {song.artist || "Unknown Artist"}
                                </div>
                              </td>
                              <td className="py-3 truncate max-w-[150px] hidden sm:table-cell">
                                {song.artist || "Unknown Artist"}
                              </td>
                              <td className="py-3 truncate max-w-[150px] hidden md:table-cell">
                                {song.album || "—"}
                              </td>
                              <td className="py-3 text-center hidden sm:table-cell">
                                {formatTime(song.duration_s || 0)}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSongFromPlaylist(
                                      activePlaylistDetails.id,
                                      song.id,
                                    );
                                  }}
                                  className="p-1.5 rounded-lg text-brand-text-secondary hover:text-red-400 hover:bg-brand-border/40 transition-colors cursor-pointer"
                                  title="Remove from playlist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeView === "admin" && <AdminConsole />}
          </div>
        </main>
      </div>

      {/* ── COLUMN 3: Bottom Persistent Audio Player Bar ─────────────── */}
      {/* ── COLUMN 3: Bottom Persistent Audio Player Bar ─────────────── */}
      <footer className="h-24 bg-brand-bg-secondary/95 backdrop-blur-md border-t border-brand-border flex flex-row items-center justify-between px-4 sm:px-6 z-40 select-none shadow-2xl shrink-0 relative">
        {/* Absolute mobile timeline on top border */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-border/40 sm:hidden">
          <div
            className="h-full bg-brand-accent transition-all duration-100"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* 4.1 Track Information Display (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial sm:w-1/4 min-w-0 pr-2">
          {currentSong ? (
            <div className="flex items-center gap-3 min-w-0 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-brand-bg-primary border border-brand-border flex items-center justify-center shrink-0 shadow-lg">
                <CoverImage
                  songId={currentSong.id}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 truncate">
                <span className="text-xs sm:text-sm font-bold text-white truncate hover:underline cursor-pointer">
                  {currentSong.title}
                </span>
                <span className="text-[10px] sm:text-xs text-brand-text-secondary truncate mt-0.5">
                  {currentSong.artist || "Unknown Artist"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-brand-text-secondary/50 text-xs truncate">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-brand-bg-primary/50 border border-brand-border/50 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="truncate">No song selected</span>
            </div>
          )}
        </div>

        {/* 4.2 Media Core Controls & Timeline (Center) */}
        <div className="flex flex-col items-center justify-center flex-none sm:flex-1 max-w-2xl">
          {/* Controls */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex ${
                isShuffle
                  ? "text-brand-accent hover:text-brand-accent"
                  : "text-brand-text-secondary hover:text-white"
              }`}
              title="Shuffle toggle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleSkipPrevious}
              className="p-1.5 text-brand-text-secondary hover:text-white transition-colors cursor-pointer"
              title="Previous track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={handleSkipBackward5}
              className="p-1.5 text-brand-text-secondary hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
              title="-5s Rewind"
            >
              <span className="text-xs font-bold leading-none">-5s</span>
            </button>

            <button
              onClick={togglePlayPause}
              disabled={!currentSong}
              className="w-10 h-10 rounded-full bg-brand-accent hover:bg-brand-accent-hover text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleSkipForward5}
              className="p-1.5 text-brand-text-secondary hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
              title="+5s Skip"
            >
              <span className="text-xs font-bold leading-none">+5s</span>
            </button>
            <button
              onClick={handleSkipNext}
              className="p-1.5 text-brand-text-secondary hover:text-white transition-colors cursor-pointer"
              title="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex ${
                isAutoPlay
                  ? "text-brand-accent hover:text-brand-accent"
                  : "text-brand-text-secondary hover:text-white"
              }`}
              title={isAutoPlay ? "Autoplay Enabled" : "Autoplay Disabled"}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* 4.3 Timeline Progress Bar */}
          <div className="w-full flex items-center gap-3 mt-2 hidden sm:flex">
            <span className="text-[10px] font-semibold text-brand-text-secondary w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="flex-1 h-1 bg-brand-border/60 hover:bg-brand-border rounded-lg appearance-none transition-colors"
              disabled={!currentSong}
            />
            <span className="text-[10px] font-semibold text-brand-text-secondary w-10 text-left">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Extra Controls: Volume / Mute (Right) */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-brand-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-24 h-1 bg-brand-border/60 hover:bg-brand-border rounded-lg appearance-none transition-colors"
          />
        </div>
      </footer>

      {/* Playlist Creation Modal */}
      {showCreateModal && (
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
                disabled={playlistActionLoading}
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
                  disabled={playlistActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg transition-colors shadow-lg active:scale-98 cursor-pointer disabled:opacity-40"
                  disabled={!newPlaylistName.trim() || playlistActionLoading}
                >
                  {playlistActionLoading ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
