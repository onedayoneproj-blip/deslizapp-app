// «Mi marca» para el retoque, en la demo (la misma validación que impone la base en Supabase): tabla `marca_tienda` y
// `marca_referencias`. Funciones puras sobre la DB de la demo; el Instagram vive en `tiendas.instagram`, como en producción.

import { EVITA_MAX, instagramLimpio, MARCA_VACIA, PALABRA_MAX, PALABRAS_MARCA, REFERENCIAS_MAX, type DatosMarcaRetoque, type MarcaRetoque, type ReferenciaMarca } from "../marca-retoque";
import type { DB } from "./db";
import { DatosInvalidos } from "./errores";

/** Lo que la demo guarda por tienda (el Instagram va en la tienda). */
export type MarcaGuardada = { palabras: string[]; evita: string | null; referencias: ReferenciaMarca[] };

export function marcaDeDB(db: DB, tiendaId: string): MarcaRetoque {
  const t = db.tiendas.find((x) => x.id === tiendaId);
  const m = db.marcasRetoque?.[tiendaId];
  if (!t) return structuredClone(MARCA_VACIA);
  return structuredClone({
    instagram: t.instagram ?? null,
    palabras: m?.palabras ?? [],
    evita: m?.evita ?? null,
    referencias: [...(m?.referencias ?? [])].sort((a, b) => a.orden - b.orden),
  });
}

/** Valida lo que se va a guardar. Lanza DatosInvalidos con el mensaje para la persona (las mismas reglas que las restricciones de la base). */
export function validarMarcaRetoque(datos: DatosMarcaRetoque) {
  const palabras = datos.palabras.map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
  if (palabras.length > PALABRAS_MARCA || palabras.some((p) => p.length > PALABRA_MAX)) throw new DatosInvalidos(`Hasta ${PALABRAS_MARCA} palabras, de hasta ${PALABRA_MAX} letras cada una.`);
  const evita = datos.evita?.trim() || null;
  if (evita && evita.length > EVITA_MAX) throw new DatosInvalidos(`Lo que no quieres cabe en ${EVITA_MAX} letras.`);
  const ig = instagramLimpio(datos.instagram ?? "");
  if (!ig.valido) throw new DatosInvalidos("Ese Instagram no se ve bien. Solo letras, números, punto y guion bajo.");
  return { palabras, evita, instagram: ig.valor };
}

/** Cuántas referencias quedarían: nunca más de 6. */
export function comprobarTopeReferencias(quedan: number, nuevas: number) {
  if (quedan + nuevas > REFERENCIAS_MAX) throw new DatosInvalidos(`Hasta ${REFERENCIAS_MAX} fotos de referencia.`);
}

export function guardarMarcaEnDB(db: DB, tiendaId: string, datos: DatosMarcaRetoque, nuevoId: () => string) {
  if (!db.tiendas.some((t) => t.id === tiendaId)) throw new DatosInvalidos("No encontramos tu tienda.");
  const { palabras, evita, instagram } = validarMarcaRetoque(datos);
  const actual = db.marcasRetoque?.[tiendaId]?.referencias ?? [];
  const quedan = actual.filter((r) => !datos.quitar.includes(r.id));
  comprobarTopeReferencias(quedan.length, datos.nuevas.length);
  const base = quedan.reduce((n, r) => Math.max(n, r.orden + 1), 0);
  const referencias = [...quedan, ...datos.nuevas.map((url, i): ReferenciaMarca => ({ id: nuevoId(), url, orden: base + i }))];
  const siguiente: DB = {
    ...db,
    tiendas: db.tiendas.map((t) => (t.id === tiendaId ? { ...t, instagram } : t)),
    marcasRetoque: { ...db.marcasRetoque, [tiendaId]: { palabras, evita, referencias } },
  };
  return { db: siguiente, marca: marcaDeDB(siguiente, tiendaId) };
}

const degradado = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/></svg>`)}`;

/** Marca lista de ejemplo para Luna Bisutería, la tienda de la demo que ya pide retoques (las demás empiezan sin marca). */
export const LUNA_DEMO = "a1000000-0000-4000-8000-000000000002";
export function marcasDeLaDemo(): Record<string, MarcaGuardada> {
  return {
    [LUNA_DEMO]: {
      palabras: ["delicada", "luminosa", "artesanal"],
      evita: "Nada de fondos oscuros",
      referencias: [
        { id: "ref-luna-1", url: degradado("#f5d9c8", "#d9a98a"), orden: 0 },
        { id: "ref-luna-2", url: degradado("#e8e0cf", "#b9a98a"), orden: 1 },
        { id: "ref-luna-3", url: degradado("#d3e3da", "#8fae9d"), orden: 2 },
      ],
    },
  };
}
