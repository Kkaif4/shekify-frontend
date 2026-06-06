"use client";

import React from "react";
import {
  Search,
  Loader2,
  Music2,
  Pause,
  Play,
  PlusCircle,
} from "lucide-react";
import { CoverImage } from "./CoverImage";
import { useDashboard } from "./DashboardContext";

export function LibraryView() {
  const {
    songs,
    songsLoading,
    searchQuery,
    setSearchQuery,
    selectedSongIndex,
    setSelectedSongIndex,
    currentSong,
    isPlaying,
    handlePlaySong,
    activeDropdownSongId,
    setActiveDropdownSongId,
    playlists,
    handleToggleSongInPlaylist,
    formatTime,
  } = useDashboard();

  return (
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
                Could not find any files matching your search filters in local indexes.
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
                            activeDropdownSongId === song.id ? null : song.id,
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
                                const isInPlaylist = pl.songs.some(
                                  (s) => s.id === song.id,
                                );
                                return (
                                  <label
                                    key={pl.id}
                                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-brand-border/30 transition-colors cursor-pointer select-none text-xs"
                                    onClick={(e) => e.stopPropagation()}
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
  );
}
