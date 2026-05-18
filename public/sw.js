// Odi.Pet Service Worker — Web Push Handler
// Placed at /public/sw.js → served from https://odi.pet/sw.js

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Odi.Pet', body: event.data.text() }
  }

  const { title, body, icon, badge, url, tag } = payload

  event.waitUntil(
    self.registration.showNotification(title || 'Odi.Pet Hatırlatması', {
      body: body || '',
      icon: icon || '/logo.jpg',
      badge: badge || '/logo.jpg',
      tag: tag || 'odi-notification',
      renotify: true,
      requireInteraction: false,
      data: { url: url || '/owner/dashboard' },
      actions: [
        { action: 'open', title: 'Takvimi Aç' },
        { action: 'dismiss', title: 'Kapat' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/owner/dashboard'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(targetUrl)
            return
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

self.addEventListener('notificationclose', (_event) => {
  // Analytics hook: track dismissed notifications
})

// Keep service worker alive
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
