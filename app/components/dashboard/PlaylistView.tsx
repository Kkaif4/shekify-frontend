"use client";

import React from "react";
import {
  Music,
  Pause,
  Play,
  Trash2,
  FolderMinus,
} from "lucide-react";
import { CoverImage } from "./CoverImage";
import { useDashboard } from "./DashboardContext";

export function PlaylistView() {
  const {
    activePlaylistDetails,
    isPlaying,
    playbackQueue,
    audioRef,
    setIsPlaying,
    handlePlaySong,
    setIsAutoPlay,
    handleDeletePlaylist,
    selectedSongIndex,
    setSelectedSongIndex,
    handleRemoveSongFromPlaylist,
    formatTime,
    currentSong,
  } = useDashboard();

  if (!activePlaylistDetails) return null;

  const isPlayingThisPlaylist =
    isPlaying &&
    playbackQueue.length === activePlaylistDetails.songs.length &&
    playbackQueue.every(
      (song, i) => song.id === activePlaylistDetails.songs[i]?.id,
    );

  return (
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
                {isPlayingThisPlaylist ? (
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
                onClick={() => handleDeletePlaylist(activePlaylistDetails.id)}
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
            Go to the Library or Search and click the ➕ button to append song records here.
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
                      handlePlaySong(song, activePlaylistDetails.songs)
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
                          handlePlaySong(song, activePlaylistDetails.songs);
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
  );
}
