/**
 * Service Worker pour Tower Rush PWA
 * Gère le cache et maintient l'app en vie en arrière-plan
 */

const CACHE_NAME = 'tower-rush-v1';
const urlsToCache = [
  './',
  './index.html',
  './game.js',
  './multiplayer.js',
  './game-worker.js',
  './style.css',
  './manifest.json',
  './assets/main.mp3',
  // Assets des bâtiments
  './assets/Buildings/Blue Buildings/House1.png',
  './assets/Buildings/Blue Buildings/House2.png',
  './assets/Buildings/Blue Buildings/House3.png',
  './assets/Buildings/Blue Buildings/Tower.png',
  './assets/Buildings/Blue Buildings/Castle.png',
  './assets/Buildings/Red Buildings/House1.png',
  './assets/Buildings/Red Buildings/House2.png',
  './assets/Buildings/Red Buildings/House3.png',
  './assets/Buildings/Red Buildings/Tower.png',
  './assets/Buildings/Red Buildings/Castle.png',
  './assets/Buildings/Black Buildings/House1.png',
  './assets/Buildings/Black Buildings/House2.png',
  './assets/Buildings/Black Buildings/House3.png',
  './assets/Buildings/Black Buildings/Tower.png',
  './assets/Buildings/Black Buildings/Castle.png',
  './assets/Buildings/Yellow Buildings/House1.png',
  './assets/Buildings/Yellow Buildings/House2.png',
  './assets/Buildings/Yellow Buildings/House3.png',
  './assets/Buildings/Yellow Buildings/Tower.png',
  './assets/Buildings/Yellow Buildings/Castle.png',
  './assets/Buildings/Stone Buildings/House1.png',
  './assets/Buildings/Stone Buildings/House2.png',
  './assets/Buildings/Stone Buildings/House3.png',
  './assets/Buildings/Stone Buildings/Tower.png',
  './assets/Buildings/Stone Buildings/Castle.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Erreur cache:', err);
        // Continuer même si le cache échoue
        return Promise.resolve();
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression ancien cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourner la version en cache si disponible
        if (response) {
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request).catch(() => {
          // Si la requête échoue, retourner la page d'accueil pour les navigations
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Gérer les messages de l'application
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'KEEP_ALIVE':
      // Maintenir le service worker actif
      console.log('Service Worker: Keep alive signal received');
      break;
      
    case 'GAME_STATE_UPDATE':
      // Recevoir les mises à jour de l'état du jeu
      console.log('Service Worker: Game state update received');
      // Ici on pourrait stocker l'état pour une reprise après crash
      break;
      
    default:
      console.log('Service Worker: Message inconnu:', type);
  }
});

// Maintenir le service worker actif avec un heartbeat
setInterval(() => {
  console.log('Service Worker: Heartbeat');
}, 30000); // Toutes les 30 secondes

console.log('Service Worker: Chargé et prêt');