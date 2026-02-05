const CACHE_NAME = "vibesphere-offline-v4";
const OFFLINE_URL = "/offline.html";

// 1. Install Event: Offline page ko cache (save) kar lo
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.add(OFFLINE_URL);
        })
    );
});

// 2. Fetch Event: Agar Net nahi hai, toh Offline Page dikhao
self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
    }
});