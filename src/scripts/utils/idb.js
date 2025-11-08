class IndexedDBService {
  constructor() {
    this.dbName = "CeritaDB";
    this.version = 3;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("offlineStories")) {
          const store = db.createObjectStore("offlineStories", {
            keyPath: "id",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains("cachedStories")) {
          db.createObjectStore("cachedStories", { keyPath: "id" });
        }
      };
    });
  }

  async saveOfflineStory(story) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["offlineStories"], "readwrite");
      const store = tx.objectStore("offlineStories");

      const storyWithMeta = {
        ...story,
        id: `offline_${Date.now()}`,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      const request = store.add(storyWithMeta);
      request.onsuccess = () => resolve(storyWithMeta);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineStories() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["offlineStories"], "readonly");
      const store = tx.objectStore("offlineStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheStories(stories) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["cachedStories"], "readwrite");
      const store = tx.objectStore("cachedStories");

      store.clear();

      stories.forEach((story) => {
        store.add(story);
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedStories() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["cachedStories"], "readonly");
      const store = tx.objectStore("cachedStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const idbService = new IndexedDBService();
