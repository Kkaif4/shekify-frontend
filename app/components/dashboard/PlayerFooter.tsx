"use client";

import React from "react";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Loader2,
  Music,
} from "lucide-react";
import { CoverImage } from "./CoverImage";
import { useDashboard } from "./DashboardContext";

export function PlayerFooter() {
  const {
    currentSong,
    isPlaying,
    isAudioBuffering,
    isShuffle,
    isAutoPlay,
    currentTime,
    duration,
    volume,
    isMuted,
    toggleShuffle,
    handleSkipPrevious,
    handleSkipBackward5,
    togglePlayPause,
    handleSkipForward5,
    handleSkipNext,
    setIsAutoPlay,
    setIsMuted,
    setVolume,
    handleSeekChange,
    formatTime,
  } = useDashboard();

  return (
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
            {isAudioBuffering ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isPlaying ? (
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
  );
}
