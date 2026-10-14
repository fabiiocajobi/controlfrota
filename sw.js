/* Control Frota — service worker
   Faz cache do "app shell" para o sistema abrir mesmo sem internet.
   Todos os dados (veículos, motoristas, registros) ficam no localStorage,
   então funcionam offline independentemente deste arquivo.

   IMPORTANTE: a estratégia é "rede primeiro, cache como reserva" — assim,
   sempre que o aparelho estiver online, o app carrega a versão mais nova
   publicada (evitando telas/opções antigas "grudadas" pelo cache do PWA).
   O cache só é usado quando não há internet. */

const CACHE_NAME = "controlfrota-v7"; // troque este nome a cada nova versão publicada
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/favicon.png",
  "./assets/icons/icon-96.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
