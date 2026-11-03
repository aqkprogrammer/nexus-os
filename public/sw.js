// Shows push notifications and opens the app when one is tapped. It caches nothing, so the app is never stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data?.text() };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || "NEXUS OS", {
      body: data.body || "",
      icon: `${scope}icon-192.png`,
      badge: `${scope}icon-192.png`,
      data: { url: new URL((data.url || "/").replace(/^\//, ""), scope).href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope));
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
