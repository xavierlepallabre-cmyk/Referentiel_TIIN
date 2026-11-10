// Service worker : met l'application en cache pour un usage hors ligne (atelier).
// À chaque mise à jour : incrémenter VERSION ici ET le suffixe ?v= dans index.html.
const VERSION = 'ref-tiin-v4';
const FICHIERS = [
  './', 'index.html', 'styles.css?v=4', 'app.js?v=4', 'icon.svg',
  'manifest.webmanifest', 'data/referentiel.js?v=4'
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
    fetch(e.request, { cache: 'no-cache' })
      .then(rep => {
        const copie = rep.clone();
        caches.open(VERSION).then(c => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request))
  );
});
