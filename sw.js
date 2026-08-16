/* ================================================================
   ROBOT CHRONICLE — SERVICE WORKER
   Version du cache : à incrémenter à CHAQUE livraison, sinon le
   navigateur continue de servir l'ancienne version du jeu.
   ================================================================ */

const CACHE_NAME = 'robot-chronicle-v0.12.3';

// Fichiers mis en cache dès l'installation
const CORE_ASSETS = [
  './',
  './index.html',
  './robot-chronicle.html',
  './manifest.json',
  './splash.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ----------------------------------------------------------------
// INSTALLATION — met en cache le nécessaire, puis prend la main
// ----------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll échoue en bloc si un seul fichier manque (ex. icônes
        // pas encore fournies) : on ajoute donc les fichiers un par un.
        return Promise.all(
          CORE_ASSETS.map((url) =>
            cache.add(url).catch(() => {
              console.warn('[SW] Fichier ignoré (absent) :', url);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------------
// ACTIVATION — supprime les caches des versions précédentes
// ----------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('robot-chronicle-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------
// FETCH — réseau d'abord, cache en secours
//
// Choix volontaire : le jeu est livré en un fichier HTML unique qui
// change à chaque version. Une stratégie « cache d'abord » servirait
// indéfiniment l'ancienne version, ce qui a déjà posé problème sur
// d'autres projets. Ici la dernière version est toujours récupérée
// quand le réseau répond, et le cache prend le relais hors ligne.
// ----------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On ne gère que les requêtes GET de même origine
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Réponse valide : on rafraîchit le cache au passage
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => {
        // Hors ligne : on sert la version en cache
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // Navigation sans correspondance : on renvoie la page d'accueil
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('Hors ligne', {
            status: 503,
            statusText: 'Hors ligne',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});

// ----------------------------------------------------------------
// MESSAGE — permet à la page de forcer l'activation d'une mise à jour
// ----------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
