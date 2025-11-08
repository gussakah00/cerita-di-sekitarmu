const CACHE_NAME = "cerita-di-sekitarmu-gussakah-v2.1.0";
const API_CACHE_NAME = "api-cache-v2";
const VAPID_PUBLIC_KEY =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

// Base path untuk GitHub Pages
const BASE_PATH = "/cerita-di-sekitarmu";

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/styles/styles.css`,
  `${BASE_PATH}/app.bundle.js`,
  "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
];

// Install Event
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching App Shell");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event dengan base path handling
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle relative paths for GitHub Pages
  if (
    request.url.startsWith(self.location.origin) &&
    !url.pathname.startsWith(BASE_PATH)
  ) {
    const newUrl = new URL(
      `${BASE_PATH}${url.pathname}${url.search}${url.hash}`,
      self.location.origin
    );
    event.respondWith(fetch(newUrl));
    return;
  }

  // API Stories - Cache First dengan fallback ke network
  if (url.pathname.includes("/v1/stories") && request.method === "GET") {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache di background
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  cache.put(request, networkResponse.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return new Response(
                JSON.stringify({
                  error: false,
                  message: "Stories fetched from cache (offline)",
                  listStory: [],
                }),
                {
                  headers: { "Content-Type": "application/json" },
                }
              );
            });
        });
      })
    );
    return;
  }

  // Static assets - Cache First
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }

          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return fetchResponse;
        });
      })
    );
  }
});

// Push Notification (tetap sama)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push Received");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "Cerita di Sekitarmu",
      options: {
        body: "Ada cerita baru yang dibagikan!",
        icon: `${BASE_PATH}/public/images/logo.png`,
        badge: `${BASE_PATH}/public/images/mark.png`,
      },
    };
  }

  const title = data.title || "Cerita di Sekitarmu";
  const options = {
    body: data.options?.body || "Notifikasi dari aplikasi cerita",
    icon: data.options?.icon || `${BASE_PATH}/public/images/logo.png`,
    badge: `${BASE_PATH}/public/images/mark.png`,
    image: data.options?.image,
    data: data.options?.data || { url: `${BASE_PATH}/` },
    actions: [
      {
        action: "open",
        title: "Buka Aplikasi",
      },
      {
        action: "close",
        title: "Tutup",
      },
    ],
    tag: "story-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click (updated untuk base path)
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "open" || event.action === "") {
    const urlToOpen = event.notification.data?.url || `${BASE_PATH}/`;

    event.waitUntil(
      clients.matchAll({ type: "window" }).then((windowClients) => {
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background Sync (tetap sama)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-stories") {
    console.log("Background sync for offline stories");
    event.waitUntil(syncOfflineStories());
  }
});

// ... (fungsi helper lainnya tetap sama seperti sebelumnya)
async function syncOfflineStories() {
  try {
    const db = await openIDB();
    const tx = db.transaction(["offlineStories"], "readonly");
    const store = tx.objectStore("offlineStories");
    const stories = await store.getAll();

    for (const story of stories) {
      try {
        await postStoryToAPI(story);
        const deleteTx = db.transaction(["offlineStories"], "readwrite");
        const deleteStore = deleteTx.objectStore("offlineStories");
        await deleteStore.delete(story.id);
        console.log("Successfully synced story:", story.id);
      } catch (error) {
        console.error("Failed to sync story:", story.id, error);
      }
    }
  } catch (error) {
    console.error("Error in background sync:", error);
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CeritaDB", 3);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offlineStories")) {
        const store = db.createObjectStore("offlineStories", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

async function postStoryToAPI(story) {
  const token = await getTokenFromStorage();
  if (!token) {
    throw new Error("No authentication token available");
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

async function getTokenFromStorage() {
  return new Promise((resolve) => {
    if ("caches" in self) {
      caches
        .match("/auth-token")
        .then((response) => {
          if (response) {
            response.text().then(resolve);
          } else {
            resolve(localStorage.getItem("token"));
          }
        })
        .catch(() => resolve(localStorage.getItem("token")));
    } else {
      resolve(localStorage.getItem("token"));
    }
  });
}
