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

/** ¿Es la demo? Ni la demo interna, ni la de la landing, ni el catálogo de demostración, ni `?demo`, ni quien eligió «Ver demo» (data-dz-demo) cuentan. */
export function enDemo(): boolean {
  const { pathname, search } = location;
  if (pathname === "/tienda/deslizapp-ejemplo") return true;
  if (pathname.startsWith("/demo-interna") || pathname.startsWith("/demo-landing")) return true;
  if (document.documentElement.hasAttribute("data-dz-demo")) return true;
  return new URLSearchParams(search).has("demo");
}

function noMedir(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (navigator.webdriver) return true; // Playwright y compañía
  return location.pathname.startsWith("/admin") || enDemo();
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
