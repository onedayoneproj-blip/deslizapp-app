// Manda un evento de medición (docs/18-medicion.md). Solo para el navegador. Nunca espera, nunca lanza y nunca rompe la página:
// si algo falla, no pasa nada. No manda nada en desarrollo, en la demo interna ni en pruebas automáticas.
// Sin cookies ni identificador: lo único que se guarda en el navegador es el origen de la visita, en sessionStorage (se borra al cerrar la pestaña).

import { deducirOrigen, type DatosEvento, type Evento, type Origen } from "./eventos";

const KEY_ORIGEN = "dz_origen";

function origenDeLaVisita(): Origen {
  try {
    const guardado = sessionStorage.getItem(KEY_ORIGEN);
    if (guardado === "instagram" || guardado === "whatsapp" || guardado === "directo" || guardado === "otro") return guardado;
  } catch {
    /* sin sessionStorage: se deduce cada vez */
  }
  const origen =
    deducirOrigen({
      utmSource: new URLSearchParams(location.search).get("utm_source"),
      referer: document.referrer,
      agente: navigator.userAgent,
      host: location.hostname,
    }) ?? "directo";
  try {
    sessionStorage.setItem(KEY_ORIGEN, origen);
  } catch {
    /* ídem */
  }
  return origen;
}

function noMedir(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (navigator.webdriver) return true; // Playwright y compañía
  const { pathname, search } = location;
  if (pathname === "/tienda/deslizapp-ejemplo") return true; // el catálogo de demostración
  if (pathname.startsWith("/demo-interna") || pathname.startsWith("/demo-landing") || pathname.startsWith("/admin")) return true;
  return new URLSearchParams(search).has("demo");
}

export function registrarEvento(evento: Evento, datos?: DatosEvento): void {
  try {
    if (typeof window === "undefined" || noMedir()) return;
    const cuerpo = JSON.stringify({ evento, ruta: location.pathname, origen: origenDeLaVisita(), paso: datos?.paso, tienda_slug: datos?.tiendaSlug ?? location.pathname.match(/^\/tienda\/([^/]+)/)?.[1] });
    const url = "/api/evento";
    // text/plain: es una petición «simple», sin preflight, y la ruta lo lee igual como JSON.
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, new Blob([cuerpo], { type: "text/plain" }))) return;
    void fetch(url, { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
  } catch {
    /* la medición nunca rompe nada */
  }
}
