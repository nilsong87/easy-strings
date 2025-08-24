// Nome do cache
const CACHE_NAME = 'music-trainer-v1';
// Recursos para cache (apenas recursos essenciais e estáticos)
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/manifest.json',
  // Adicione apenas recursos que você tem certeza que existem
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker instalando...');
  
  // Pular a fase de espera e ativar imediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aberto');
        // Adicionar recursos ao cache um por um com tratamento de erro
        return Promise.all(
          urlsToCache.map(function(url) {
            return cache.add(url).catch(function(error) {
              console.warn(`Não foi possível cachear ${url}:`, error);
              // Continuar mesmo se algum recurso falhar
              return Promise.resolve();
            });
          })
        );
      })
      .then(function() {
        console.log('Todos os recursos foram cacheados');
      })
      .catch(function(error) {
        console.error('Falha na instalação do cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker ativado');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(function() {
      // Tomar controle de todas as abas imediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', function(event) {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições de terceiros
  const url = new URL(event.request.url);
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Retornar do cache se disponível
        if (response) {
          return response;
        }
        
        // Fazer requisição de rede
        return fetch(event.request)
          .then(function(networkResponse) {
            // Verificar se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clonar a resposta para armazenar no cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              })
              .catch(function(error) {
                console.warn('Não foi possível armazenar no cache:', error);
              });
            
            return networkResponse;
          })
          .catch(function(error) {
            console.warn('Falha na requisição de rede:', error);
            // Você pode retornar uma página offline personalizada aqui
            return new Response('Modo offline - Aplicativo Music Trainer', {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', function(event) {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});