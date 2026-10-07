// Service worker de deslizapp (solo se registra en producción).
//
// Reglas:
// - Páginas y código (HTML, JS, CSS): RED PRIMERO. Siempre se pide la versión publicada;
//   la copia guardada solo se usa si no hay conexión. Así nadie queda atrapado en una versión vieja.
// - Imágenes, fuentes e íconos: CACHÉ PRIMERO (cambian poco y pesan).
// - /api/*, /unirse y el propio sw.js: nunca pasan por el service worker ni por la caché. /unirse/<código> lleva un secreto de un
//   solo uso en la dirección: el service worker no lo intercepta, no lo guarda y no lo sirve sin conexión.
// Si cambia la forma de guardar, subir VERSION: al activarse borra las cachés anteriores.

const VERSION = "v2";
const CACHE_PAGINAS = `deslizapp-paginas-${VERSION}`;
const CACHE_RECURSOS = `deslizapp-recursos-${VERSION}`;

self.addEventListener("install", () => {
  // El service worker nuevo toma el control sin esperar a que se cierren las pestañas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const vigentes = [CACHE_PAGINAS, CACHE_RECURSOS];
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n.startsWith("deslizapp-") && !vigentes.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

function esRecurso(request, url) {
  return (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/seed/") ||
    url.pathname.startsWith("/_next/static/media/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  // Sin respondWith: el navegador la pide por su cuenta, igual que sin service worker.
  if (url.pathname === "/unirse" || url.pathname.startsWith("/unirse/")) return;

  if (esRecurso(request, url)) {
    event.respondWith(cachePrimero(request));
    return;
  }
  event.respondWith(redPrimero(request));
});

async function redPrimero(request) {
  const cache = await caches.open(CACHE_PAGINAS);
  try {
    const respuesta = await fetch(request);
    // Las respuestas de navegación interna de Next (?_rsc=) no se guardan: cambian en cada visita.
    const guardable = respuesta.ok && respuesta.type === "basic" && !new URL(request.url).searchParams.has("_rsc");
    if (guardable) cache.put(request, respuesta.clone());
    return respuesta;
  } catch (error) {
    const guardada = await cache.match(request, { ignoreVary: true });
    if (guardada) return guardada;
    if (request.mode === "navigate") return sinConexion();
    throw error;
  }
}

async function cachePrimero(request) {
  const cache = await caches.open(CACHE_RECURSOS);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) cache.put(request, respuesta.clone());
  return respuesta;
}

function sinConexion() {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>deslizapp</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FFF9EE;color:#174B3A;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:26px;margin:0 0 8px}button{margin-top:20px;height:48px;padding:0 24px;border:0;border-radius:999px;background:#FF834F;color:#10362A;font-weight:800;font-size:16px}</style></head>
<body><div><h1>Sin conexión.</h1><p>Hasta los mejores catálogos necesitan señal.</p><button onclick="location.reload()">Reintentar</button></div></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
