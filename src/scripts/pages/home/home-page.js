import L from "leaflet";
import { fetchStoriesWithToken } from "../../../data/api.js";
import { authService } from "../../../utils/auth.js";
import { idbService } from "../../../utils/idb.js";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HomePage = {
  _map: null,
  _stories: [],
  _filteredStories: [],
  _currentSort: "newest",
  _currentFilter: "all",

  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="home-page" aria-labelledby="home-title">
          <h1 id="home-title" tabindex="0">Akses Ditolak</h1>
          <div style="text-align: center; padding: 40px;">
            <p>Anda harus login untuk mengakses halaman ini.</p>
            <a href="#/login" class="link">Masuk</a> atau
            <a href="#/register" class="link">Daftar akun baru</a>
          </div>
        </section>
      `;
    }

    return `
      <section class="home-page" aria-labelledby="home-title">
        <h1 id="home-title" tabindex="0">Cerita di Sekitarmu</h1>
        
        <!-- Notification Controls -->
        <div class="notification-controls" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin-bottom: 10px;">Pengaturan Notifikasi</h3>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button id="subscribe-btn" class="primary-button" style="display: none;">
              🔔 Aktifkan Notifikasi
            </button>
            <button id="unsubscribe-btn" class="secondary-button" style="display: none;">
              🔕 Matikan Notifikasi
            </button>
            <span id="notification-status" class="status-disabled">Notifikasi dinonaktifkan</span>
          </div>
        </div>

        <!-- Search and Filter Controls -->
        <div class="controls-container" style="margin-bottom: 20px;">
          <div class="search-box" style="margin-bottom: 15px;">
            <input type="text" id="search-input" placeholder="Cari cerita..." 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div class="filter-controls" style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="sort-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name">Nama A-Z</option>
            </select>
            
            <select id="filter-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="all">Semua Cerita</option>
              <option value="with-location">Dengan Lokasi</option>
              <option value="without-location">Tanpa Lokasi</option>
            </select>

            <button id="sync-offline-btn" class="secondary-button" style="display: none;">
              🔄 Sync Data Offline
            </button>

            <button id="clear-search" class="secondary-button">
              ❌ Hapus Pencarian
            </button>
          </div>
        </div>

        <div id="map-container">
          <div id="map" style="height: 400px; margin-bottom: 24px; border-radius: 8px; border: 1px solid #ddd;"
               aria-label="Peta interaktif menampilkan lokasi cerita"></div>
        </div>

        <!-- Offline Stories Section -->
        <div id="offline-stories-section" style="display: none; margin-bottom: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
          <h3 style="color: #856404;">📱 Cerita Offline</h3>
          <p style="margin: 10px 0; color: #856404;">Anda memiliki cerita yang dibuat saat offline. Data akan tersinkronisasi otomatis ketika koneksi tersedia.</p>
          <div id="offline-stories-list"></div>
        </div>

        <div id="story-list" class="story-list">
          <p id="loading-message">Memuat cerita...</p>
        </div>

        <!-- Database Info -->
        <div class="db-info" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;">
          <span id="db-stats">Memuat info database...</span>
          <button id="clear-db" class="link" style="margin-left: 10px; font-size: 12px;">Hapus Cache</button>
        </div>
      </section>
    `;
  },

  async afterRender() {
    if (!authService.isLoggedIn()) return;

    // Initialize IndexedDB
    await idbService.init();

    // Initialize push notifications
    await this._initPushNotifications();

    // Initialize map
    await this._initializeMap();

    // Setup controls
    this._setupControls();

    // Load stories
    await this._loadStories();

    // Load offline stories
    await this._loadOfflineStories();

    // Update database stats
    await this._updateDatabaseStats();
  },

  async _initPushNotifications() {
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        // Import and initialize push notifications
        const { pushNotification } = await import("../../../utils/push.js");
        await pushNotification.init();

        // Setup button event listeners
        const subscribeBtn = document.getElementById("subscribe-btn");
        const unsubscribeBtn = document.getElementById("unsubscribe-btn");

        if (subscribeBtn) {
          subscribeBtn.addEventListener("click", async () => {
            try {
              await pushNotification.requestPermission();
              await pushNotification.subscribe();
              this._showMessage("Notifikasi berhasil diaktifkan!", "success");
            } catch (error) {
              this._showMessage(
                "Gagal mengaktifkan notifikasi: " + error.message,
                "error"
              );
            }
          });
        }

        if (unsubscribeBtn) {
          unsubscribeBtn.addEventListener("click", async () => {
            try {
              await pushNotification.unsubscribe();
              this._showMessage("Notifikasi dinonaktifkan", "info");
            } catch (error) {
              this._showMessage(
                "Gagal menonaktifkan notifikasi: " + error.message,
                "error"
              );
            }
          });
        }
      }
    } catch (error) {
      console.error("Error initializing push notifications:", error);
    }
  },

  async _initializeMap() {
    const mapContainer = document.querySelector("#map");
    if (!mapContainer) return;

    try {
      if (this._map) {
        this._map.remove();
      }

      this._map = L.map("map").setView([-2.5, 118.0], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        minZoom: 3,
      }).addTo(this._map);

      L.Marker.prototype.options.icon = defaultIcon;
    } catch (error) {
      console.error("Error initializing map:", error);
      const mapContainer = document.querySelector("#map-container");
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666; background: #f5f5f5; border-radius: 8px;">
            <p>Tidak dapat memuat peta</p>
            <p style="margin-top: 10px; font-size: 14px;">Pastikan koneksi internet Anda stabil.</p>
          </div>
        `;
      }
    }
  },

  _setupControls() {
    // Search functionality
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this._handleSearch(e.target.value);
      });
    }

    // Sort functionality
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this._currentSort = e.target.value;
        this._applyFilters();
      });
    }

    // Filter functionality
    const filterSelect = document.getElementById("filter-select");
    if (filterSelect) {
      filterSelect.addEventListener("change", (e) => {
        this._currentFilter = e.target.value;
        this._applyFilters();
      });
    }

    // Clear search
    const clearSearch = document.getElementById("clear-search");
    if (clearSearch) {
      clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        this._handleSearch("");
      });
    }

    // Sync offline data
    const syncOfflineBtn = document.getElementById("sync-offline-btn");
    if (syncOfflineBtn) {
      syncOfflineBtn.addEventListener("click", async () => {
        await this._syncOfflineData();
      });
    }

    // Clear database
    const clearDbBtn = document.getElementById("clear-db");
    if (clearDbBtn) {
      clearDbBtn.addEventListener("click", async () => {
        if (confirm("Apakah Anda yakin ingin menghapus semua data cache?")) {
          await this._clearDatabase();
        }
      });
    }
  },

  async _loadStories() {
    const container = document.querySelector("#story-list");
    const loadingMessage = document.querySelector("#loading-message");

    try {
      // Try to load from network first
      let stories = await fetchStoriesWithToken();

      if (stories && stories.length > 0) {
        // Cache stories to IndexedDB
        await idbService.cacheStories(stories);
        this._stories = stories;
      } else {
        // Fallback to cached stories
        stories = await idbService.getCachedStories();
        this._stories = stories || [];

        if (stories && stories.length > 0) {
          this._showMessage("Menampilkan data dari cache", "info");
        }
      }

      if (loadingMessage) loadingMessage.remove();

      if (!this._stories || this._stories.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p>Belum ada cerita yang tersedia.</p>
            <p>Jadilah yang pertama untuk <a href="#/add" class="link">berbagi cerita</a>!</p>
          </div>
        `;
        return;
      }

      this._filteredStories = [...this._stories];
      this._renderStories();
      this._updateMapMarkers();
    } catch (error) {
      console.error("Error loading stories:", error);

      // Try to load from cache as last resort
      try {
        const cachedStories = await idbService.getCachedStories();
        if (cachedStories && cachedStories.length > 0) {
          this._stories = cachedStories;
          this._filteredStories = [...cachedStories];
          this._renderStories();
          this._updateMapMarkers();
          this._showMessage(
            "Menampilkan data dari cache (offline mode)",
            "info"
          );
          return;
        }
      } catch (cacheError) {
        console.error("Error loading from cache:", cacheError);
      }

      if (loadingMessage) loadingMessage.remove();
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Gagal memuat cerita. Silakan coba lagi nanti.</p>
          <button id="retry-stories" class="primary-button" style="margin-top: 15px;">
            Coba Lagi
          </button>
        </div>
      `;

      const retryButton = document.getElementById("retry-stories");
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          this._loadStories();
        });
      }
    }
  },

  async _loadOfflineStories() {
    try {
      const offlineStories = await idbService.getOfflineStories();
      const unsyncedStories = offlineStories.filter((story) => !story.synced);

      if (unsyncedStories.length > 0) {
        const offlineSection = document.getElementById(
          "offline-stories-section"
        );
        const offlineList = document.getElementById("offline-stories-list");
        const syncBtn = document.getElementById("sync-offline-btn");

        if (offlineSection) offlineSection.style.display = "block";
        if (syncBtn) syncBtn.style.display = "block";

        if (offlineList) {
          offlineList.innerHTML = `
            <p><strong>${
              unsyncedStories.length
            } cerita menunggu sinkronisasi:</strong></p>
            ${unsyncedStories
              .map(
                (story) => `
              <div style="padding: 8px; margin: 5px 0; background: white; border-radius: 4px;">
                <strong>${story.description.substring(0, 50)}...</strong>
                <br><small>Dibuat: ${new Date(story.timestamp).toLocaleString(
                  "id-ID"
                )}</small>
              </div>
            `
              )
              .join("")}
          `;
        }
      }
    } catch (error) {
      console.error("Error loading offline stories:", error);
    }
  },

  async _syncOfflineData() {
    const syncBtn = document.getElementById("sync-offline-btn");
    const originalText = syncBtn?.textContent;

    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.textContent = "Menyinkronisasi...";
    }

    try {
      const result = await idbService.syncOfflineData();

      if (result.success) {
        this._showMessage(
          `Berhasil menyinkronisasi ${result.synced} cerita`,
          "success"
        );
        await this._loadOfflineStories();
        await this._loadStories(); // Reload stories to include synced ones
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this._showMessage(
        "Gagal menyinkronisasi data: " + error.message,
        "error"
      );
    } finally {
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.textContent = originalText;
      }
    }
  },

  async _handleSearch(query) {
    if (!query.trim()) {
      this._filteredStories = [...this._stories];
    } else {
      try {
        this._filteredStories = await idbService.searchStories(query);
      } catch (error) {
        console.error("Error searching stories:", error);
        // Fallback to client-side search
        this._filteredStories = this._stories.filter(
          (story) =>
            story.name.toLowerCase().includes(query.toLowerCase()) ||
            story.description.toLowerCase().includes(query.toLowerCase())
        );
      }
    }

    this._applyFilters();
  },

  async _applyFilters() {
    let filtered = [...this._filteredStories];

    // Apply location filter
    if (this._currentFilter === "with-location") {
      filtered = filtered.filter((story) => story.lat && story.lon);
    } else if (this._currentFilter === "without-location") {
      filtered = filtered.filter((story) => !story.lat || !story.lon);
    }

    // Apply sorting
    try {
      filtered = await idbService.sortStories.call(
        { getCachedStories: () => Promise.resolve(filtered) },
        this._currentSort
      );
    } catch (error) {
      // Fallback to client-side sorting
      filtered.sort((a, b) => {
        switch (this._currentSort) {
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

    this._renderStories(filtered);
    this._updateMapMarkers(filtered);
  },

  _renderStories(stories = this._filteredStories) {
    const container = document.querySelector("#story-list");
    if (!container) return;

    if (!stories || stories.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p>Tidak ada cerita yang sesuai dengan filter.</p>
          <button id="clear-filters" class="primary-button" style="margin-top: 15px;">
            Tampilkan Semua
          </button>
        </div>
      `;

      const clearFiltersBtn = document.getElementById("clear-filters");
      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
          document.getElementById("search-input").value = "";
          document.getElementById("filter-select").value = "all";
          document.getElementById("sort-select").value = "newest";
          this._filteredStories = [...this._stories];
          this._renderStories();
          this._updateMapMarkers();
        });
      }
      return;
    }

    const storyItems = stories
      .map((story, index) => {
        let displayTitle = "Cerita Tanpa Judul";
        let displayDescription = story.description;

        if (
          story.description &&
          story.description.startsWith("**") &&
          story.description.includes("**\n")
        ) {
          const parts = story.description.split("**\n");
          if (parts.length >= 2) {
            displayTitle = parts[0].replace("**", "").trim();
            displayDescription = parts.slice(1).join("").trim();
          }
        }

        if (displayTitle === "Cerita Tanpa Judul" && story.name) {
          displayTitle = story.name;
        }

        const displayName = displayTitle;
        const hasValidCoordinates =
          story.lat &&
          story.lon &&
          !isNaN(parseFloat(story.lat)) &&
          !isNaN(parseFloat(story.lon));

        let dateInfo = "";
        if (story.createdAt) {
          try {
            const date = new Date(story.createdAt);
            dateInfo = `<small>Diposting: ${date.toLocaleDateString(
              "id-ID"
            )}</small>`;
          } catch (e) {
            console.error("Error formatting date:", e);
          }
        }

        return `
          <article class="story-card" data-index="${index}" tabindex="0"
                   data-has-coordinates="${hasValidCoordinates}"
                   data-story-id="${story.id}"
                   aria-label="Cerita: ${displayName}">
            <img src="${story.photoUrl}"
                 alt="Foto ilustrasi cerita ${displayName}"
                 class="story-photo"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4='">
            <div class="story-content">
              <h3>${displayName}</h3>
              <p>${displayDescription}</p>
              <div class="story-meta">
                <small>Lokasi: ${
                  hasValidCoordinates
                    ? `${story.lat}, ${story.lon}`
                    : "Tidak tersedia"
                }</small>
                ${dateInfo}
                ${
                  story.synced === false
                    ? '<span style="color: orange; font-weight: bold;">[OFFLINE]</span>'
                    : ""
                }
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    container.innerHTML = storyItems;
    this._setupStoryInteractivity(stories);
  },

  _updateMapMarkers(stories = this._filteredStories) {
    if (!this._map) return;

    // Clear existing markers
    this._map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        this._map.removeLayer(layer);
      }
    });

    const markers = [];
    const storiesWithCoordinates = stories.filter(
      (story) =>
        story.lat &&
        story.lon &&
        !isNaN(parseFloat(story.lat)) &&
        !isNaN(parseFloat(story.lon))
    );

    storiesWithCoordinates.forEach((story, index) => {
      try {
        let displayTitle = story.name || "Cerita Tanpa Judul";
        let displayDescription = story.description;

        if (
          story.description &&
          story.description.startsWith("**") &&
          story.description.includes("**\n")
        ) {
          const parts = story.description.split("**\n");
          if (parts.length >= 2) {
            displayTitle = parts[0].replace("**", "").trim();
            displayDescription = parts.slice(1).join("").trim();
          }
        }

        const marker = L.marker([
          parseFloat(story.lat),
          parseFloat(story.lon),
        ]).addTo(this._map).bindPopup(`
            <div style="max-width: 200px;">
              <strong>${displayTitle}</strong><br>
              <img src="${story.photoUrl}" alt="${displayTitle}" 
                   style="width:100%;height:auto;margin:5px 0;border-radius:4px;">
              <p style="margin:8px 0;">${displayDescription.substring(0, 100)}${
          displayDescription.length > 100 ? "..." : ""
        }</p>
              <small style="color:#666;">Lokasi: ${story.lat}, ${
          story.lon
        }</small>
            </div>
          `);

        markers.push(marker);
      } catch (markerError) {
        console.error(`Error adding marker for story ${index}:`, markerError);
      }
    });

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      this._map.fitBounds(group.getBounds().pad(0.1));
    }
  },

  _setupStoryInteractivity(stories) {
    const container = document.querySelector("#story-list");
    if (!container) return;

    container.querySelectorAll(".story-card").forEach((card, index) => {
      const hasCoordinates =
        card.getAttribute("data-has-coordinates") === "true";
      const story = stories[index];

      if (hasCoordinates && story && this._map) {
        const marker = this._findMarkerByStory(story);

        if (marker) {
          card.addEventListener("click", () => {
            marker.openPopup();
            this._map.setView(marker.getLatLng(), 12);

            card.style.transform = "scale(0.98)";
            setTimeout(() => {
              card.style.transform = "scale(1)";
            }, 150);
          });

          card.addEventListener("keypress", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              marker.openPopup();
              this._map.setView(marker.getLatLng(), 12);
            }
          });

          card.style.cursor = "pointer";
          card.addEventListener("mouseenter", () => {
            card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          });

          card.addEventListener("mouseleave", () => {
            card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          });
        }
      }
    });
  },

  _findMarkerByStory(story) {
    let foundMarker = null;

    this._map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const latLng = layer.getLatLng();
        if (
          latLng.lat === parseFloat(story.lat) &&
          latLng.lng === parseFloat(story.lon)
        ) {
          foundMarker = layer;
        }
      }
    });

    return foundMarker;
  },

  async _updateDatabaseStats() {
    try {
      const statsElement = document.getElementById("db-stats");
      if (!statsElement) return;

      const cachedStories = await idbService.getCachedStories();
      const offlineStories = await idbService.getOfflineStories();
      const dbSize = await idbService.getDatabaseSize();

      const stats = {
        cached: cachedStories?.length || 0,
        offline: offlineStories?.length || 0,
        size: (dbSize / 1024).toFixed(2),
      };

      statsElement.textContent = `Cache: ${stats.cached} cerita | Offline: ${stats.offline} cerita | Size: ${stats.size} KB`;
    } catch (error) {
      console.error("Error updating database stats:", error);
    }
  },

  async _clearDatabase() {
    try {
      await idbService.clearAllData();
      this._showMessage("Cache berhasil dihapus", "success");
      await this._updateDatabaseStats();
      await this._loadStories();
    } catch (error) {
      this._showMessage("Gagal menghapus cache: " + error.message, "error");
    }
  },

  _showMessage(message, type = "info") {
    // Remove existing message
    const existingMessage = document.getElementById("global-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement("div");
    messageDiv.id = "global-message";
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;

    const backgroundColor =
      {
        success: "#28a745",
        error: "#dc3545",
        info: "#17a2b8",
        warning: "#ffc107",
      }[type] || "#17a2b8";

    messageDiv.style.backgroundColor = backgroundColor;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  },

  cleanup() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    this._stories = [];
    this._filteredStories = [];
  },
};

export default HomePage;
