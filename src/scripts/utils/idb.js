class IndexedDBService {
  constructor() {
    this.dbName = "CeritaDB";
    this.version = 3;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Object store untuk stories offline
        if (!db.objectStoreNames.contains("offlineStories")) {
          const store = db.createObjectStore("offlineStories", {
            keyPath: "id",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
        }

        // Object store untuk cached stories
        if (!db.objectStoreNames.contains("cachedStories")) {
          const store = db.createObjectStore("cachedStories", {
            keyPath: "id",
          });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Object store untuk user preferences
        if (!db.objectStoreNames.contains("preferences")) {
          const store = db.createObjectStore("preferences", { keyPath: "key" });
        }
      };
    });
  }

  // CRUD Operations untuk offline stories
  async saveOfflineStory(story) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["offlineStories"], "readwrite");
      const store = tx.objectStore("offlineStories");

      const storyWithMeta = {
        ...story,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      const request = store.add(storyWithMeta);

      request.onsuccess = () => resolve(storyWithMeta);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["offlineStories"], "readonly");
      const store = tx.objectStore("offlineStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineStory(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["offlineStories"], "readwrite");
      const store = tx.objectStore("offlineStories");
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async markStoryAsSynced(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["offlineStories"], "readwrite");
      const store = tx.objectStore("offlineStories");

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const story = getRequest.result;
        if (story) {
          story.synced = true;
          const updateRequest = store.put(story);
          updateRequest.onsuccess = () => resolve(story);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error("Story not found"));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // CRUD Operations untuk cached stories
  async cacheStories(stories) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["cachedStories"], "readwrite");
      const store = tx.objectStore("cachedStories");

      // Clear existing cache
      store.clear();

      // Add new stories
      stories.forEach((story) => {
        store.add(story);
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["cachedStories"], "readonly");
      const store = tx.objectStore("cachedStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchStories(query) {
    const stories = await this.getCachedStories();
    return stories.filter(
      (story) =>
        story.name.toLowerCase().includes(query.toLowerCase()) ||
        story.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async filterStoriesByLocation(hasLocation) {
    const stories = await this.getCachedStories();
    return stories.filter((story) =>
      hasLocation ? story.lat && story.lon : !story.lat || !story.lon
    );
  }

  async sortStories(sortBy = "newest") {
    const stories = await this.getCachedStories();

    return stories.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }

  // Preferences operations
  async savePreference(key, value) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["preferences"], "readwrite");
      const store = tx.objectStore("preferences");
      const request = store.put({ key, value });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getPreference(key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["preferences"], "readonly");
      const store = tx.objectStore("preferences");
      const request = store.get(key);

      request.onsuccess = () =>
        resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync offline data dengan background sync
  async syncOfflineData() {
    try {
      const offlineStories = await this.getOfflineStories();
      const unsyncedStories = offlineStories.filter((story) => !story.synced);

      for (const story of unsyncedStories) {
        try {
          // Simulate API call - in real implementation, this would be your actual API call
          await this.syncStoryToAPI(story);
          await this.markStoryAsSynced(story.id);
          console.log(`Successfully synced story: ${story.id}`);
        } catch (error) {
          console.error(`Failed to sync story ${story.id}:`, error);
        }
      }

      return {
        success: true,
        synced: unsyncedStories.length,
        failed: 0, // Simplified - in real implementation, track failures
      };
    } catch (error) {
      console.error("Error syncing offline data:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async syncStoryToAPI(story) {
    // This would be your actual API call to post the story
    // For now, we'll simulate it
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No authentication token");
    }

    const formData = new FormData();
    formData.append("description", story.description);
    formData.append("photo", story.photo);
    if (story.lat) formData.append("lat", story.lat);
    if (story.lon) formData.append("lon", story.lon);

    const response = await fetch("https://story-api.dicoding.dev/v1/stories", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // Utility methods
  async clearAllData() {
    if (!this.db) await this.init();

    return Promise.all([
      this.clearStore("offlineStories"),
      this.clearStore("cachedStories"),
      this.clearStore("preferences"),
    ]);
  }

  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getDatabaseSize() {
    if (!this.db) await this.init();

    const stores = ["offlineStories", "cachedStories", "preferences"];
    let totalSize = 0;

    for (const storeName of stores) {
      const size = await this.getStoreSize(storeName);
      totalSize += size;
    }

    return totalSize;
  }

  async getStoreSize(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const data = JSON.stringify(request.result);
        resolve(new Blob([data]).size);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const idbService = new IndexedDBService();
