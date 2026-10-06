// El interruptor «Retocar esta foto» de la ficha (decisión al subir la foto). Lógica pura, sin React: se prueba con node
// (tests/retoque-al-subir.test.mjs). El interruptor es solo una intención del borrador: no reserva créditos ni llama a nada
// hasta que el producto se guarda; después, cada foto marcada se manda con su URL ya guardada (taller.pedirDe).

import { CREDITOS_POR_RETOQUE } from "./config";
import { MOTIVO_SIN_CREDITOS, MOTIVO_SOLO_MIRAR } from "./retoque-textos";

export type EstadoInterruptor = { deshabilitado: boolean; motivo: string | null };

/**
 * ¿Se puede encender el interruptor de esta foto? Cuenta TODAS las fotos marcadas, no una a una: con 12 créditos libres caben
 * dos (10) y la tercera ya no. Una foto ya encendida siempre se puede apagar (el motivo solo aparece al apagarla).
 */
export function estadoInterruptor(p: {
  soloMirar: boolean;
  libres: number;
  /** Cuántas fotos están marcadas en el borrador (incluida esta, si lo está). */
  marcadas: number;
  estaMarcada: boolean;
  costo?: number;
}): EstadoInterruptor {
  const costo = p.costo ?? CREDITOS_POR_RETOQUE;
  if (p.soloMirar) return { deshabilitado: true, motivo: MOTIVO_SOLO_MIRAR };
  if (p.estaMarcada) return { deshabilitado: false, motivo: null };
  return p.libres >= costo * (p.marcadas + 1) ? { deshabilitado: false, motivo: null } : { deshabilitado: true, motivo: MOTIVO_SIN_CREDITOS };
}

/**
 * Las URLs YA GUARDADAS de las fotos marcadas. Al guardar, una foto nueva cambia de URL (de data URL a Storage), así que se
 * empareja por posición entre las fotos del borrador y las del producto guardado, que conserva el orden. Si la cuenta no
 * cuadra (no debería pasar), devuelve null y no se manda nada: mejor ninguna que una equivocada.
 */
export function urlsGuardadasMarcadas(marcadasPorFoto: boolean[], urlsGuardadas: string[]): string[] | null {
  if (marcadasPorFoto.length !== urlsGuardadas.length) return null;
  return urlsGuardadas.filter((_, i) => marcadasPorFoto[i]);
}

export type ResultadoRetoques = { marcadas: number; enviadas: number };

/**
 * Manda al taller las fotos marcadas, una tras otra. Nunca lanza: lo que falle se cuenta y el producto, que ya estaba
 * guardado, sigue guardado.
 */
export async function mandarMarcadas(urls: string[] | null, total: number, pedir: (url: string) => Promise<boolean>): Promise<ResultadoRetoques> {
  if (total === 0) return { marcadas: 0, enviadas: 0 };
  if (!urls) return { marcadas: total, enviadas: 0 };
  let enviadas = 0;
  for (const url of urls) {
    try {
      if (await pedir(url)) enviadas++;
    } catch {
      // Cuenta como fallida; las demás siguen.
    }
  }
  return { marcadas: total, enviadas };
}
