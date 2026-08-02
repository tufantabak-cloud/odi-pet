// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
  interface NotificationData {
    url?: string;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

import { NetworkOnly } from "serwist";

const customRuntimeCaching = [
  {
    matcher: ({ url }: { url: URL }) =>
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/owner') ||
      url.pathname.startsWith('/clinic') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/caregiver'),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

// PWA Cache Buster: v1.0.3 (private pages excluded from precache)
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customRuntimeCaching,
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

// ── Explicit Install & Activate Handlers ────────────────────────
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()

      // Clean up legacy sensitive caches created by previous service worker versions
      const cacheNames = await self.caches.keys()
      const sensitiveCachePrefixes = [
        'apis',
        'pages',
        'pages-rsc',
        'pages-rsc-prefetch',
        'serwist-runtime',
      ]

      await Promise.all(
        cacheNames.map((cacheName) => {
          if (sensitiveCachePrefixes.some((prefix) => cacheName.includes(prefix))) {
            console.info(`[sw] Purging sensitive cache: ${cacheName}`)
            return self.caches.delete(cacheName)
          }
          return Promise.resolve(true)
        })
      )
    })()
  )
})

// ── PWA Push Notification Handler ───────────────────────────────
// Receives push messages from the server (web-push) and displays
// OS-level notifications. Without this listener, pushes arrive
// silently and are discarded.
self.addEventListener('push', (event: PushEvent) => {
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
  const options: NotificationOptions & { data: NotificationData } = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/brand/app-icons/odi-icon-256.png',
    badge: payload.badge ?? '/brand/app-icons/odi-icon-256.png',
    tag: payload.tag ?? `odi-${Date.now()}`,
    renotify: true,
    data: {
      url: payload.url ?? '/owner/notifications',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click → Deep Link ──────────────────────────────
// When the user taps the notification, navigate to the relevant
// pet's task page (e.g. /owner/pets/{id}#pet-tasks).
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const data = event.notification.data as NotificationData;
  let targetUrl = '/owner/notifications';

  try {
    const requestedUrl = new URL(data?.url ?? targetUrl, self.location.origin);
    if (requestedUrl.origin === self.location.origin) {
      targetUrl = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
    }
  } catch {
    // Malformed or cross-origin targets fall back to the notifications page.
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients: WindowClient[]) => {
      // If an Odi.Pet tab is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
