import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── PWA Push Notification Handler ───────────────────────────────
// Receives push messages from the server (web-push) and displays
// OS-level notifications. Without this listener, pushes arrive
// silently and are discarded.
self.addEventListener('push', (event: any) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  };

  try {
    payload = event.data.json();
  } catch {
    // Fallback for plain-text payloads
    payload = { title: 'Odi.Pet', body: event.data.text() };
  }

  const title = payload.title ?? 'Odi.Pet';
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    tag: payload.tag ?? `odi-${Date.now()}`,
    renotify: true,
    data: {
      url: payload.url ?? '/owner/notifications',
    },
  } as any;

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click → Deep Link ──────────────────────────────
// When the user taps the notification, navigate to the relevant
// pet's task page (e.g. /owner/pets/{id}#pet-tasks).
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/owner/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients: any[]) => {
      // If an Odi.Pet tab is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
