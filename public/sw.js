/* global self, clients */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "Tienes una misión próxima." };
  }

  const title = typeof payload.title === "string" ? payload.title : "Bitácora del Navegante";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Tienes una misión próxima.",
    icon: "/favicon.svg",
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    data: { url: typeof payload.url === "string" ? payload.url : "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url ?? "/";
  const target = new URL(requestedUrl, self.location.origin);
  const targetUrl = target.origin === self.location.origin ? target.href : self.location.origin;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existingWindow = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existingWindow) {
      if ("navigate" in existingWindow) await existingWindow.navigate(targetUrl);
      return existingWindow.focus();
    }
    return clients.openWindow(targetUrl);
  })());
});
