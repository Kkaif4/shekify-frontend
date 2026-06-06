import { apiClient } from "./apiClient";
import { usePlaylistStore } from "../store/playlistStore";

export interface QueueItem {
  type: "add_track" | "remove_track" | "create_playlist";
  playlistId: string; // Could be a temporary ID (like local-...)
  payload: any;
}

class SyncQueue {
  private queue: Map<string, QueueItem> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  enqueue(item: QueueItem) {
    // Unique key so we don't repeat the exact same action for the same playlist/track
    const key = `${item.playlistId}-${item.type}-${item.payload.trackId || ""}`;
    this.queue.set(key, item);

    // Schedule sync (debounced)
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), this.DEBOUNCE_MS);
  }

  private async sync() {
    if (this.queue.size === 0) return;

    const items = Array.from(this.queue.values());
    console.log(`[SyncQueue] Starting sync for ${items.length} operations...`);

    try {
      const response = await apiClient.request("/playlists/batch-sync", {
        method: "POST",
        body: JSON.stringify({ operations: items }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // Process results
      results.forEach((res: any) => {
        const matchingKey = Array.from(this.queue.keys()).find(
          (k) => k.startsWith(`${res.playlistId}-${res.type}`)
        );

        if (res.status === "success") {
          // Success: Mark synced in Zustand store
          usePlaylistStore.getState().markPlaylistSynced(
            res.playlistId,
            res.newId, // If new playlist created, map the local temp ID to actual DB UUID
            res.name
          );

          if (matchingKey) {
            this.queue.delete(matchingKey);
          }
        } else {
          console.error(`[SyncQueue] Operation failed for playlist ${res.playlistId}:`, res.error);
          usePlaylistStore.getState().markPlaylistFailed(res.playlistId);
          if (matchingKey) {
            this.queue.delete(matchingKey);
          }
        }
      });

      this.retryCount = 0;
      console.log(`[SyncQueue] Sync completed. Remaining queue size: ${this.queue.size}`);
      
      // If some items failed but others succeeded, they are cleared or marked failed.
      // If there are still items left in the queue, schedule sync again.
      if (this.queue.size > 0) {
        this.timer = setTimeout(() => this.sync(), this.DEBOUNCE_MS);
      }
    } catch (error) {
      console.error("[SyncQueue] Sync failed:", error);
      
      this.retryCount++;
      if (this.retryCount <= this.MAX_RETRIES) {
        const delay = 5000 * this.retryCount;
        console.log(`[SyncQueue] Retrying in ${delay}ms (Attempt ${this.retryCount}/${this.MAX_RETRIES})...`);
        this.timer = setTimeout(() => this.sync(), delay);
      } else {
        console.error("[SyncQueue] Max retries exceeded. Marking pending updates as failed.");
        // Mark all playlists in the queue as failed
        const uniquePlaylistIds = new Set(items.map((it) => it.playlistId));
        uniquePlaylistIds.forEach((id) => {
          usePlaylistStore.getState().markPlaylistFailed(id);
        });
        this.queue.clear();
        this.retryCount = 0;
      }
    }
  }

  getSize(): number {
    return this.queue.size;
  }
}

export const syncQueue = new SyncQueue();
