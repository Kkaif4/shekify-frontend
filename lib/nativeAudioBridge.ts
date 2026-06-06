import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AudioServicePlugin {
  startPlayback(options: { trackUrl: string; title: string; artist: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: 'trackComplete', listenerFunc: () => void): Promise<any>;
}

export const AudioService = registerPlugin<AudioServicePlugin>('AudioService');

export interface NativeAudioOptions {
  trackUrl: string;
  title: string;
  artist: string;
  albumArt?: string;
  duration?: number;
}

export class NativeAudioBridge {
  private isNativeAvailable = false;
  private htmlAudioFallback: HTMLAudioElement | null = null;
  private currentDuration: number = 0;

  constructor() {
    this.isNativeAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  public async playTrack(options: NativeAudioOptions): Promise<void> {
    if (this.isNativeAvailable) {
      return this.playNative(options);
    } else {
      return this.playHtmlAudio(options);
    }
  }

  private async playNative(options: NativeAudioOptions): Promise<void> {
    try {
      if (this.isNativeAvailable) {
        await AudioService.startPlayback({
          trackUrl: options.trackUrl,
          title: options.title,
          artist: options.artist,
        });
      } else {
        console.warn('[NativeAudioBridge] Native service not bound. Falling back to HTML5 audio.');
        await this.playHtmlAudio(options);
      }
      console.log('[Audio] Native playback intended');
    } catch (error) {
      console.error('[Audio] Native playback failed, falling back to HTML5', error);
      await this.playHtmlAudio(options);
    }
  }

  private async playHtmlAudio(options: NativeAudioOptions): Promise<void> {
    if (!this.htmlAudioFallback) {
      this.htmlAudioFallback = new Audio();
      this.htmlAudioFallback.crossOrigin = 'anonymous';
    }

    // Set duration for fallback simulation
    this.currentDuration = options.duration || 0;

    this.htmlAudioFallback.src = options.trackUrl;
    this.htmlAudioFallback.load();

    try {
      await this.htmlAudioFallback.play();
      console.log('[Audio] HTML5 fallback playback started');
    } catch (error) {
      console.error('[Audio] HTML5 playback failed', error);
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (this.isNativeAvailable) {
      await AudioService.pause();
    } else if (this.htmlAudioFallback) {
      this.htmlAudioFallback.pause();
    }
  }

  public async resume(): Promise<void> {
    if (this.isNativeAvailable) {
      await AudioService.resume();
    } else if (this.htmlAudioFallback) {
      await this.htmlAudioFallback.play();
    }
  }

  public async stop(): Promise<void> {
    if (this.isNativeAvailable) {
      await AudioService.stop();
    } else if (this.htmlAudioFallback) {
      this.htmlAudioFallback.pause();
      this.htmlAudioFallback.src = '';
    }
  }

  public getCurrentTime(): number {
    if (this.htmlAudioFallback) {
      return this.htmlAudioFallback.currentTime;
    }
    return 0; // Native polling needs async bridge
  }

  public getDuration(): number {
    if (this.htmlAudioFallback) {
      return this.htmlAudioFallback.duration || this.currentDuration;
    }
    return this.currentDuration;
  }

  public isNativeAudio(): boolean {
    return this.isNativeAvailable && !!(window as any).audioService;
  }
}

export const nativeAudioBridge = new NativeAudioBridge();
