// Service worker : met l'application en cache pour un usage hors ligne (atelier).
// Incrémenter VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement.
const VERSION = 'ref-tiin-v2';
const FICHIERS = [
  './', 'index.html', 'styles.css', 'app.js', 'icon.svg',
  'manifest.webmanifest', 'data/referentiel.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== VERSION).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour récupérer les mises à jour), cache en secours.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(rep => {
        const copie = rep.clone();
        caches.open(VERSION).then(c => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request))
  );
});
