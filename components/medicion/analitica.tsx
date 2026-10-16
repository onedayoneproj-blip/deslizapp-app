"use client";

import { Analytics, type BeforeSend } from "@vercel/analytics/next";
import { enDemo } from "@/lib/medicion/registrar-evento";

/** Solo cuentan las rutas públicas (docs/18-medicion.md): `/`, `/conoce`, `/tienda/*`, `/pedido/*`, `/privacidad` y `/terminos`. */
const RUTAS_PUBLICAS = /^\/(?:conoce|privacidad|terminos|tienda\/[^/]+|pedido\/[^/]+)?\/?$/;

const soloPublicas: BeforeSend = (evento) => {
  try {
    const url = new URL(evento.url);
    if (!RUTAS_PUBLICAS.test(url.pathname)) return null;
    // La demo no cuenta (la misma regla que registrarEvento). Mira la página actual: `beforeSend` corre en el navegador.
    if (enDemo()) return null;
    // Sin ?consulta ni #hash (utm, códigos…), y un código de pedido no sale del navegador.
    return { ...evento, url: url.origin + url.pathname.replace(/^\/pedido\/[^/]+/, "/pedido/*") };
  } catch {
    return null;
  }
};

/** Vercel Web Analytics (sin cookies). Es un componente de cliente porque `beforeSend` es una función. */
export function Analitica() {
  return <Analytics beforeSend={soloPublicas} />;
}
