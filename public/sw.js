// Powered By Vistech Force
// Minimal service worker: lets the app install. Pages and API calls always go to the network
// (HR data must never be stale); only a small offline message is cached.
const C = "crewone-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.put("/offline", new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:system-ui;text-align:center;padding:48px'><h2>You are offline</h2><p>CrewOne needs an internet connection. Please reconnect and try again.</p>", { headers: { "Content-Type": "text/html" } })))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match("/offline")));
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "CrewOne", { body: d.body || "", icon: "/api/pwa-icon?size=192", badge: "/api/pwa-icon?size=192", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
