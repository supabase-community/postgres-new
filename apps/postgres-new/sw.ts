export type {}
declare const self: ServiceWorkerGlobalScope

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/chat')) {
  }

  event.respondWith(fetch(event.request))
})
