// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
  interface NotificationData {
    url?: string;
    notification_tag?: string;
    entity_type?: string;
    entity_id?: string;
    version?: number;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

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

// PWA Cache Buster: v3.2 Enterprise Notification Certified
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
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

// ── PWA Push Notification Handler (v3.2 Certified) ─────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    version?: number;
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    entity_type?: string;
    entity_id?: string;
    event?: string;
    priority?: 'high' | 'normal' | 'low';
  };

  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Odi.Pet', body: event.data.text() };
  }

  // KVKK/GDPR Payload Privacy & Lock Screen Deduplication
  const title = payload.title ?? 'Odi.Pet 🐾';
  const body = payload.body ?? 'Yeni bir bildiriminiz var.';
  
  // Entity-Based Lock Screen Deduplication Tagging
  const notificationTag = payload.tag 
    ?? (payload.entity_type && payload.entity_id ? `${payload.entity_type}:${payload.entity_id}:${payload.event ?? 'due'}` : `odi-${Date.now()}`);

  const options: NotificationOptions & { data: NotificationData } = {
    body,
    icon: payload.icon ?? '/brand/app-icons/odi-icon-256.png',
    badge: payload.badge ?? '/brand/app-icons/odi-icon-256.png',
    tag: notificationTag,
    renotify: false, // Prevents lock screen cluttering for same task
    data: {
      url: payload.url ?? '/owner/notifications',
      notification_tag: notificationTag,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      version: payload.version ?? 1,
    },
  };

  // App Badge Sync
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge().catch(() => {});
  }

  // Live In-App Sync via postMessage to open clients
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.visibilityState === 'visible') {
          client.postMessage({
            type: 'REFRESH_NOTIFICATIONS',
            payload: { title, body, url: payload.url }
          });
        }
      }
      return self.registration.showNotification(title, options);
    })()
  );
});

// ── Notification Click → Deep Link & Offline Recovery ─────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  // Clear App Badge on Click
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const data = event.notification.data as NotificationData;
  let targetUrl = '/owner/notifications';

  try {
    const requestedUrl = new URL(data?.url ?? targetUrl, self.location.origin);
    if (requestedUrl.origin === self.location.origin) {
      targetUrl = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
    }
  } catch {
    targetUrl = '/owner/dashboard'; // Deep Link Validation Safe Fallback
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients: WindowClient[]) => {
      // Offline Click Recovery Check
      if (!self.navigator.onLine) {
        return self.clients.openWindow('/offline');
      }

      // Safari Focus & OpenWindow Pipeline
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'REFRESH_NOTIFICATIONS' });
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
