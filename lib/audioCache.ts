import { SecureTokenStorage } from "./secureStorage";
import { ENV } from "./environment";

const DB_NAME = "shekify_audio_cache";
const STORE_NAME = "cached_songs";
const DB_VERSION = 1;

class AudioCacheManager {
  private db: IDBDatabase | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "songId" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("Failed to open IndexedDB audio cache:", request.error);
        reject(request.error);
      };
    });
  }

  async getCachedSong(songId: string): Promise<Blob | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(songId);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error(`Error reading song ${songId} from cache:`, request.error);
          resolve(null);
        };
      });
    } catch (e) {
      console.error("getCachedSong failed:", e);
      return null;
    }
  }

  async cacheSong(songId: string, blob: Blob): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const item = {
          songId,
          blob,
          cachedAt: Date.now(),
        };

        const request = store.put(item);

        request.onsuccess = () => {
          console.log(`[AudioCache] Successfully cached song ${songId}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`Failed to write song ${songId} to cache:`, request.error);
          reject(request.error);
        };
      });
    } catch (e) {
      console.error("cacheSong failed:", e);
    }
  }

  /**
   * Prefetch a song from backend in background and cache it.
   */
  async prefetchSong(songId: string): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // 1. Check if already cached
      const cached = await this.getCachedSong(songId);
      if (cached) {
        console.debug(`[AudioCache] Prefetch skip: Song ${songId} already cached.`);
        return;
      }

      console.log(`[AudioCache] Prefetching song ${songId} in background...`);
      const token = await SecureTokenStorage.getAccessToken();
      const url = `${ENV.API_URL}/stream/${songId}?token=${token}&ngrok-skip-browser-warning=69420`;

      const res = await fetch(url, {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      });

      if (!res.ok) {
        throw new Error(`Prefetch stream request failed with status ${res.status}`);
      }

      const blob = await res.blob();
      await this.cacheSong(songId, blob);
    } catch (err) {
      console.error(`[AudioCache] Prefetch failed for song ${songId}:`, err);
    }
  }

  /**
   * Clear the entire cache if space is needed.
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log("[AudioCache] Cache cleared successfully.");
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error("clearCache failed:", e);
    }
  }
}

export const audioCacheManager = new AudioCacheManager();
