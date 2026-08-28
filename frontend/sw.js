// 規格書 v2 定案：PWA 僅需支援「加到主畫面」安裝體驗，不需要離線瀏覽
// 或離線寫入。這支 Service Worker 刻意保持最簡單：不做任何快取，只
// 是瀏覽器判斷「這是一個可安裝的 PWA」所需要的最低限度存在。
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // 不攔截、不快取，所有請求維持一般線上行為。
});
