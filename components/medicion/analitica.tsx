"use client";

import { Analytics, type BeforeSend } from "@vercel/analytics/next";

/** Solo cuentan las rutas públicas (docs/18-medicion.md): `/`, `/conoce`, `/tienda/*`, `/pedido/*`, `/privacidad` y `/terminos`. */
const RUTAS_PUBLICAS = /^\/(?:conoce|privacidad|terminos|tienda\/[^/]+|pedido\/[^/]+)?\/?$/;

const soloPublicas: BeforeSend = (evento) => {
  try {
    const { pathname, search } = new URL(evento.url);
    if (!RUTAS_PUBLICAS.test(pathname)) return null;
    // Ni la demo interna ni las vistas de prueba cuentan.
    if (new URLSearchParams(search).has("demo")) return null;
    // Un código de pedido no sale del navegador.
    return { ...evento, url: evento.url.replace(/\/pedido\/[^/?#]+/, "/pedido/*") };
  } catch {
    return null;
  }
};

/** Vercel Web Analytics (sin cookies). Es un componente de cliente porque `beforeSend` es una función. */
export function Analitica() {
  return <Analytics beforeSend={soloPublicas} />;
}
