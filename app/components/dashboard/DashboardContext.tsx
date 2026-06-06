"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import DOMPurify from "dompurify";
import { ENV } from "@/lib/environment";
import { Playlist, Song, usePlaylistStore } from "@/store/playlistStore";
import { useAuth } from "@/app/context/AuthContext";
import { syncQueue } from "@/lib/syncQueue";
import { apiClient } from "@/lib/apiClient";
import { audioCacheManager } from "@/lib/audioCache";
import { nativeAudioBridge } from "@/lib/nativeAudioBridge";
import { Capacitor } from "@capacitor/core";

const API_BASE = ENV.API_URL;

export interface Toast {
  id: string;
  message: string;
  type: "info" | "error" | "success";
}

interface DashboardContextProps {
  // Authentication & Global state
  token: string | null;
  user: any;
  logout: () => void;
  isAdmin: boolean;
  syncQueueSize: number;

  // Navigation / Views
  activeView: "home" | "search" | "ingest" | "playlist" | "admin";
  setActiveView: (
    view: "home" | "search" | "ingest" | "playlist" | "admin",
  ) => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;

  // Songs Catalog & Search
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearch: string;
  songsLoading: boolean;
  songsLoadingMore: boolean;
  songsPage: number;
  songsTotalPages: number;
  fetchSongs: (search?: string, page?: number) => Promise<void>;

  // Playlist Details & Operations
  playlists: Playlist[];
  playlistsLoading: boolean;
  activePlaylistDetails: Playlist | null;
  playlistSongsPage: number;
  playlistSongsTotalPages: number;
  playlistSongsLoadingMore: boolean;
  fetchPlaylists: () => Promise<void>;
  fetchPlaylistDetails: (playlistId: string, page?: number) => Promise<void>;
  handleCreatePlaylist: (e: React.FormEvent) => Promise<void>;
  handleDeletePlaylist: (playlistId: string) => Promise<void>;
  handleAddSongToPlaylist: (
    playlistId: string,
    songId: string,
  ) => Promise<void>;
  handleToggleSongInPlaylist: (
    playlistId: string,
    songId: string,
    shouldAdd: boolean,
  ) => Promise<void>;
  handleRemoveSongFromPlaylist: (
    playlistId: string,
    songId: string,
  ) => Promise<void>;
  newPlaylistName: string;
  setNewPlaylistName: (name: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  activeDropdownSongId: string | null;
  setActiveDropdownSongId: (id: string | null) => void;

  // Ingestion View
  ingestSong: string;
  setIngestSong: (name: string) => void;
  ingestSinger: string;
  setIngestSinger: (singer: string) => void;
  ingestYear: string;
  setIngestYear: (year: string) => void;
  ingestAlbum: string;
  setIngestAlbum: (album: string) => void;
  ingestStatus: "idle" | "loading" | "success";
  handleIngestionSubmit: (e: React.FormEvent) => Promise<void>;

  // Audio Engine State & Operations
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  currentSong: Song | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  volume: number;
  setVolume: (vol: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isShuffle: boolean;
  isAutoPlay: boolean;
  setIsAutoPlay: (autoplay: boolean) => void;
  isAudioBuffering: boolean;
  playbackQueue: Song[];
  currentQueueIndex: number;
  playbackHistory: string[];
  handlePlaySong: (song: Song, contextSongs: Song[]) => Promise<void>;
  togglePlayPause: () => void;
  handleSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSkipForward5: () => void;
  handleSkipBackward5: () => void;
  handleSkipNext: () => void;
  handleSkipPrevious: () => void;
  toggleShuffle: () => void;
  seekTo: (time: number) => void;

  // Toast Messaging
  toasts: Toast[];
  addToast: (message: string, type?: "info" | "error" | "success") => void;

  // Keyboard Navigation / Accessibility
  selectedSongIndex: number | null;
  setSelectedSongIndex: React.Dispatch<React.SetStateAction<number | null>>;
  getDisplayedSongs: () => Song[];
  formatTime: (time: number) => string;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(
  undefined,
);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token, logout, isAdmin } = useAuth();

  const {
    playlists,
    activePlaylistDetails,
    setPlaylists,
    setActivePlaylistDetails,
    createPlaylistOptimistic,
    addTrackOptimistic,
    removeTrackOptimistic,
  } = usePlaylistStore();

  // Navigation / Views
  const [activeView, setActiveView] = useState<
    "home" | "search" | "ingest" | "playlist" | "admin"
  >("home");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Buffer Loading / Sync State
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const retryAttemptRef = useRef(0);
  const activeSongIdRef = useRef<string | null>(null);
  const [syncQueueSize, setSyncQueueSize] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncQueueSize(syncQueue.getSize());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Data State
  const [songs, setSongs] = useState<Song[]>([]);
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

  // Playlist Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

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
  const [toasts, setToasts] = useState<Toast[]>([]);

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
        const mappedPlaylists = data.map((pl: any) => ({
          ...pl,
          songs: pl.songs
            ? pl.songs.map((s: any) => ({ id: s.song_id || s.id, title: "" }))
            : [],
        }));
        setPlaylists(mappedPlaylists);
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
          const currentDetails =
            usePlaylistStore.getState().activePlaylistDetails;
          if (currentDetails && currentDetails.id === playlistId) {
            const existingIds = new Set(
              currentDetails.songs.map((s: any) => s.id),
            );
            const newSongs = data.songs.filter(
              (s: any) => !existingIds.has(s.id),
            );
            setActivePlaylistDetails({
              ...currentDetails,
              songs: [...currentDetails.songs, ...newSongs],
            });
          }
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

        setIngestSong("");
        setIngestSinger("");
        setIngestYear("");
        setIngestAlbum("");

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

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const tempId = "local-" + Date.now();
    createPlaylistOptimistic(tempId, newPlaylistName.trim());
    addToast(`Playlist "${newPlaylistName.trim()}" created!`, "success");
    setNewPlaylistName("");
    setShowCreateModal(false);

    syncQueue.enqueue({
      type: "create_playlist",
      playlistId: tempId,
      payload: { name: newPlaylistName.trim() },
    });
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
        usePlaylistStore.setState((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
          activePlaylistDetails:
            state.activePlaylistDetails?.id === playlistId
              ? null
              : state.activePlaylistDetails,
        }));
        setActiveView("home");
        setActivePlaylistId(null);
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
    const song = songs.find((s) => s.id === songId);
    if (!song) return;

    addTrackOptimistic(playlistId, song);
    const pl = playlists.find((p) => p.id === playlistId);
    addToast(`Added track to "${pl?.name || "playlist"}"`, "success");
    setActiveDropdownSongId(null);

    syncQueue.enqueue({
      type: "add_track",
      playlistId,
      payload: { trackId: songId },
    });
  };

  const handleToggleSongInPlaylist = async (
    playlistId: string,
    songId: string,
    shouldAdd: boolean,
  ) => {
    if (shouldAdd) {
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      addTrackOptimistic(playlistId, song);
      const pl = playlists.find((p) => p.id === playlistId);
      addToast(`Added track to "${pl?.name || "playlist"}"`, "success");

      syncQueue.enqueue({
        type: "add_track",
        playlistId,
        payload: { trackId: songId },
      });
    } else {
      removeTrackOptimistic(playlistId, songId);
      const pl = playlists.find((p) => p.id === playlistId);
      addToast(`Removed track from "${pl?.name || "playlist"}"`, "success");

      syncQueue.enqueue({
        type: "remove_track",
        playlistId,
        payload: { trackId: songId },
      });
    }
  };

  const handleRemoveSongFromPlaylist = async (
    playlistId: string,
    songId: string,
  ) => {
    removeTrackOptimistic(playlistId, songId);
    addToast("Song removed from playlist", "success");

    syncQueue.enqueue({
      type: "remove_track",
      playlistId,
      payload: { trackId: songId },
    });
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

      if (mediaError && mediaError.code === 1) {
        console.debug(
          "Playback request aborted (normal when skipping tracks rapidly).",
        );
        return;
      }

      if (retryAttemptRef.current < 3) {
        retryAttemptRef.current += 1;
        const delay = Math.pow(2, retryAttemptRef.current) * 1000;
        console.warn(
          `[AudioEngine] Playback failed. Retrying in ${delay}ms (Attempt ${retryAttemptRef.current}/3)...`,
        );

        setIsAudioBuffering(true);

        setTimeout(() => {
          if (activeSongIdRef.current) {
            console.log(
              `[AudioEngine] Executing retry for song ${activeSongIdRef.current}...`,
            );
            audio.load();
            audio.play().catch((err) => {
              console.error("[AudioEngine] Retry play attempt failed:", err);
            });
          }
        }, delay);
        return;
      }

      let errorMessage = "Track temporarily unavailable";

      if (mediaError) {
        switch (mediaError.code) {
          case 2:
            errorMessage =
              "Network connection failed while streaming the audio track.";
            break;
          case 3:
            errorMessage = "Failed to decode the audio file format.";
            break;
          case 4:
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
      setIsAudioBuffering(false);
      addToast(errorMessage, "error");
    };

    const handleWaiting = () => setIsAudioBuffering(true);
    const handlePlaying = () => setIsAudioBuffering(false);
    const handlePause = () => setIsAudioBuffering(false);
    const handleSeeking = () => setIsAudioBuffering(true);
    const handleSeeked = () => setIsAudioBuffering(false);
    const handleCanPlay = () => setIsAudioBuffering(false);
    const handleLoadStart = () => setIsAudioBuffering(true);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("seeking", handleSeeking);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadstart", handleLoadStart);

    let trackCompleteListener: any;
    if (Capacitor.isNativePlatform() && nativeAudioBridge.isNativeAudio()) {
      import('@/lib/nativeAudioBridge').then(({ AudioService }) => {
        AudioService.addListener('trackComplete', () => {
          if (isAutoPlayRef.current) {
            handleSkipNextRef.current();
          } else {
            setIsPlaying(false);
          }
        }).then((listener: any) => {
          trackCompleteListener = listener;
        });
      });
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("seeking", handleSeeking);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.pause();
      nativeAudioBridge.stop();
      if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
      audio.src = "";
      audio.load();
      if (trackCompleteListener) {
        trackCompleteListener.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

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

  const playSongWithCachingAndRetry = async (song: Song) => {
    if (!audioRef.current) return;

    retryAttemptRef.current = 0;
    activeSongIdRef.current = song.id;

    audioRef.current.pause();
    if (audioRef.current.src.startsWith("blob:")) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    audioRef.current.src = "";
    audioRef.current.load();

    setIsAudioBuffering(true);

    try {
      const cachedBlob = await audioCacheManager.getCachedSong(song.id);
      if (cachedBlob) {
        console.log(
          `[AudioEngine] Playing ${song.title} from IndexedDB cache.`,
        );
        const localUrl = URL.createObjectURL(cachedBlob);
        audioRef.current.src = localUrl;
      } else {
        console.log(
          `[AudioEngine] ${song.title} not cached. Streaming from network...`,
        );
        const streamUrl = `${API_BASE}/stream/${song.id}?token=${token}&ngrok-skip-browser-warning=69420`;
        audioRef.current.src = streamUrl;

        audioCacheManager.prefetchSong(song.id);
      }

      audioRef.current.load();
      
      // Sync native audio bridge
      let playUrl = audioRef.current.src;
      await nativeAudioBridge.playTrack({
        trackUrl: playUrl,
        title: song.title,
        artist: song.artist || "Unknown Artist",
      });

      // Mute HTML5 audio on native android so we don't hear double playback
      if (nativeAudioBridge.isNativeAudio()) {
        audioRef.current.muted = true;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.debug(
          "Play request aborted (normal when skipping tracks rapidly).",
        );
        return;
      }
      console.error("[AudioEngine] Error playing song:", err);
    }
  };

  const handlePlaySong = async (song: Song, contextSongs: Song[]) => {
    if (!audioRef.current) return;

    if (currentSong) {
      setPlaybackHistory((prev) => {
        const filtered = prev.filter((id) => id !== currentSong.id);
        return [...filtered, currentSong.id];
      });
    }

    setCurrentSong(song);

    setOriginalQueue(contextSongs);
    let newQueue = [...contextSongs];
    if (isShuffle) {
      newQueue = shuffleArray(contextSongs);
      const filtered = newQueue.filter((s) => s.id !== song.id);
      newQueue = [song, ...filtered];
    }
    setPlaybackQueue(newQueue);

    const idx = newQueue.findIndex((s) => s.id === song.id);
    setCurrentQueueIndex(idx !== -1 ? idx : 0);

    await playSongWithCachingAndRetry(song);

    if (idx !== -1 && idx + 1 < newQueue.length) {
      audioCacheManager.prefetchSong(newQueue[idx + 1].id);
    }
  };

  const getDisplayedSongs = (): Song[] => {
    if (activeView === "home") {
      return songs;
    }
    if (activeView === "playlist" && activePlaylistDetails) {
      return activePlaylistDetails.songs;
    }
    return [];
  };

  const scrollIndexIntoView = (index: number) => {
    setTimeout(() => {
      const row = document.querySelector(`tr[data-index="${index}"]`);
      if (row) {
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 50);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      nativeAudioBridge.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          nativeAudioBridge.resume();
          setIsPlaying(true);
        })
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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkipForward5 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      audioRef.current.currentTime + 5,
      duration,
    );
  };

  const handleSkipBackward5 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      audioRef.current.currentTime - 5,
      0,
    );
  };

  const loadAndPlayFromQueue = async (song: Song, index: number) => {
    if (!audioRef.current) return;

    setCurrentSong(song);
    setCurrentQueueIndex(index);

    await playSongWithCachingAndRetry(song);

    if (index + 1 < playbackQueue.length) {
      audioCacheManager.prefetchSong(playbackQueue[index + 1].id);
    }
  };

  const handleSkipNext = () => {
    if (playbackQueue.length === 0 || currentQueueIndex === -1) return;

    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < playbackQueue.length) {
      const nextSong = playbackQueue[nextIdx];
      if (currentSong) {
        setPlaybackHistory((prev) => [
          ...prev.filter((id) => id !== currentSong.id),
          currentSong.id,
        ]);
      }
      loadAndPlayFromQueue(nextSong, nextIdx);
    } else {
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

  const handleSkipPrevious = () => {
    if (!audioRef.current) return;

    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (playbackHistory.length > 0) {
      const prevHistory = [...playbackHistory];
      const prevSongId = prevHistory.pop()!;
      setPlaybackHistory(prevHistory);

      const songToPlay =
        playbackQueue.find((s) => s.id === prevSongId) ||
        songs.find((s) => s.id === prevSongId);

      if (songToPlay) {
        const idx = playbackQueue.findIndex((s) => s.id === songToPlay.id);
        loadAndPlayFromQueue(songToPlay, idx !== -1 ? idx : currentQueueIndex);
      }
    } else {
      audioRef.current.currentTime = 0;
    }
  };

  const toggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (originalQueue.length === 0 || !currentSong) return;

    if (nextShuffle) {
      let shuffled = shuffleArray(originalQueue);
      shuffled = [
        currentSong,
        ...shuffled.filter((s) => s.id !== currentSong.id),
      ];
      setPlaybackQueue(shuffled);
      setCurrentQueueIndex(0);
    } else {
      setPlaybackQueue(originalQueue);
      const idx = originalQueue.findIndex((s) => s.id === currentSong.id);
      setCurrentQueueIndex(idx !== -1 ? idx : 0);
    }
    addToast(
      nextShuffle ? "Shuffle Playback Enabled" : "Shuffle Playback Disabled",
      "info",
    );
  };

  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <DashboardContext.Provider
      value={{
        token,
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
        songs,
        setSongs,
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        songsLoading,
        songsLoadingMore,
        songsPage,
        songsTotalPages,
        fetchSongs,
        playlists,
        playlistsLoading,
        activePlaylistDetails,
        playlistSongsPage,
        playlistSongsTotalPages,
        playlistSongsLoadingMore,
        fetchPlaylists,
        fetchPlaylistDetails,
        handleCreatePlaylist,
        handleDeletePlaylist,
        handleAddSongToPlaylist,
        handleToggleSongInPlaylist,
        handleRemoveSongFromPlaylist,
        newPlaylistName,
        setNewPlaylistName,
        showCreateModal,
        setShowCreateModal,
        activeDropdownSongId,
        setActiveDropdownSongId,
        ingestSong,
        setIngestSong,
        ingestSinger,
        setIngestSinger,
        ingestYear,
        setIngestYear,
        ingestAlbum,
        setIngestAlbum,
        ingestStatus,
        handleIngestionSubmit,
        audioRef,
        currentSong,
        isPlaying,
        setIsPlaying,
        currentTime,
        setCurrentTime,
        duration,
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        isShuffle,
        isAutoPlay,
        setIsAutoPlay,
        isAudioBuffering,
        playbackQueue,
        currentQueueIndex,
        playbackHistory,
        handlePlaySong,
        togglePlayPause,
        handleSeekChange,
        handleSkipForward5,
        handleSkipBackward5,
        handleSkipNext,
        handleSkipPrevious,
        toggleShuffle,
        seekTo,
        toasts,
        addToast,
        selectedSongIndex,
        setSelectedSongIndex,
        getDisplayedSongs,
        formatTime,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
