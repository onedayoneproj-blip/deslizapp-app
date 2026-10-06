// Personalizar (admin): el borrador de cambios de un catálogo, su vista previa y la comprobación de que se guardó.
// Sin React: se prueba con node (tests/admin-personalizar.test.mjs).

import { mezclarJson, opinionesValidas, personalizacionValida } from "./personalizacion";
import type { CambiosPersonalizacion, Json, Objeto, ProductoAdmin } from "./tipos";
import type { OpinionProducto } from "../types";
import { contraste, modoOpiniones, type ModoOpiniones } from "../tienda/tema";
import { validarSvgCabecera } from "../tienda/svg-cabecera";

/** Las letras de títulos que el catálogo ya carga (app/tienda/fuentes.css y las de la app), con su letra de texto. */
export const LETRAS = [
  { display: "Cormorant Garamond", body: "Manrope", nombre: "Cormorant", estilo: "Elegante" },
  { display: "Georgia", body: "Manrope", nombre: "Georgia", estilo: "Clásica" },
  { display: "Figtree", body: "Figtree", nombre: "Figtree", estilo: "Moderna" },
  { display: "Fredoka", body: "Figtree", nombre: "Fredoka", estilo: "Divertida" },
] as const;

/** Los colores del tema que se pueden cambiar a mano (el resto sale de la marca). */
export const COLORES = [
  { clave: "bg", nombre: "Fondo" },
  { clave: "ink", nombre: "Texto" },
  { clave: "accent", nombre: "Botones" },
  { clave: "heart", nombre: "Corazón y detalles" },
] as const;
export type ClaveColor = (typeof COLORES)[number]["clave"];

/** Las frases, con su largo máximo en la app (la base admite hasta 300 por texto y 200 por línea). */
export const FRASES = [
  { clave: "boton_comprar", nombre: "Botón de comprar", max: 40, lista: false },
  { clave: "saludo_whatsapp", nombre: "Saludo de WhatsApp", max: 200, lista: false },
  { clave: "cierre_whatsapp", nombre: "Cierre de WhatsApp", max: 200, lista: false },
  { clave: "al_agregar", nombre: "Al agregar", max: 200, lista: true, maxLineas: 5 },
  { clave: "agotado_foto", nombre: "Sello de agotado", max: 30, lista: true, maxLineas: 3 },
] as const;
export type ClaveFrase = (typeof FRASES)[number]["clave"];

export const SECCIONES = [
  { clave: "chat", nombre: "Chat" },
  { clave: "busqueda", nombre: "Búsqueda" },
  { clave: "colecciones", nombre: "Colecciones" },
] as const;

export type Borrador = {
  /** Cambios de tema, mensajes y secciones con la semántica de la RPC: un null borra la clave. */
  cambios: { tema?: Objeto; mensajes?: Objeto; secciones?: Objeto };
  /** Nuevo orden de productos (ids), o null si no se tocó. */
  orden: string[] | null;
  /** Opiniones cambiadas por producto. */
  opiniones: Record<string, OpinionProducto[]>;
};
export const BORRADOR_VACIO: Borrador = { cambios: {}, orden: null, opiniones: {} };

/** Aplica un cambio al borrador (mezcla, con null para borrar). */
export function cambiar(b: Borrador, parte: "tema" | "mensajes" | "secciones", valor: Objeto): Borrador {
  return { ...b, cambios: { ...b.cambios, [parte]: mezclarJsonConNulos((b.cambios[parte] ?? {}) as Objeto, valor) } };
}

/** Como mezclarJson, pero conserva los null (en el borrador significan «borrar al guardar»). */
function mezclarJsonConNulos(a: Objeto, b: Objeto): Objeto {
  const r = structuredClone(a);
  for (const [k, v] of Object.entries(b)) {
    const actual = r[k];
    r[k] =
      v && typeof v === "object" && !Array.isArray(v) && actual && typeof actual === "object" && !Array.isArray(actual)
        ? mezclarJsonConNulos(actual as Objeto, v as Objeto)
        : structuredClone(v);
  }
  return r;
}

export const hayCambios = (b: Borrador) =>
  Object.values(b.cambios).some((v) => v && Object.keys(v).length > 0) || b.orden !== null || Object.keys(b.opiniones).length > 0;

/** La personalización como quedaría al guardar. */
export function vistaPrevia(actual: Objeto, b: Borrador): Objeto {
  return mezclarJson(actual, b.cambios as Objeto);
}

/** Lo que se manda a admin_guardar_personalizacion (merge: no borra lo que no se tocó). */
export function cambiosParaGuardar(b: Borrador, productos: ProductoAdmin[]): CambiosPersonalizacion {
  const c: CambiosPersonalizacion = {};
  for (const parte of ["tema", "mensajes", "secciones"] as const) if (b.cambios[parte] && Object.keys(b.cambios[parte]!).length) c[parte] = b.cambios[parte] as Json;
  const filas = new Map<string, { id: string; orden?: number | null; opiniones?: OpinionProducto[] }>();
  if (b.orden) b.orden.forEach((id, i) => filas.set(id, { id, orden: i + 1 }));
  for (const [id, opiniones] of Object.entries(b.opiniones)) filas.set(id, { ...(filas.get(id) ?? { id }), opiniones });
  const existentes = new Set(productos.map((p) => p.id));
  const lista = [...filas.values()].filter((f) => existentes.has(f.id));
  if (lista.length) c.productos = lista;
  return c;
}

/** Problemas que impiden guardar (vacío = se puede). */
export function problemas(actual: Objeto, b: Borrador): string[] {
  const r: string[] = [];
  const nueva = vistaPrevia(actual, b);
  const tema = (nueva.tema ?? {}) as Objeto;
  if (typeof tema.cabecera === "string") {
    const v = validarSvgCabecera(tema.cabecera);
    if (!v.ok) r.push(`Cabecera: ${v.motivo}`);
  }
  for (const [id, ops] of Object.entries(b.opiniones)) if (!opinionesValidas(ops)) r.push(`Revisa las opiniones de un producto (${id.slice(0, 8)}).`);
  if (!r.length && !personalizacionValida(nueva)) r.push("Hay algo que no se puede guardar. Revisa lo que cambiaste.");
  return r;
}

/** ¿Lo guardado ya tiene estos cambios? (para una respuesta que se perdió en la red). */
export function yaAplicado(guardada: Objeto, b: Borrador, productos: ProductoAdmin[]): boolean {
  // La base devuelve las claves en otro orden: se comparan ordenadas.
  const canon = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).sort(([a], [z]) => a.localeCompare(z)).map(([k, v]) => [k, canon(v)])) : x;
  const igual = (x: unknown, y: unknown) => JSON.stringify(canon(x)) === JSON.stringify(canon(y));
  if (!igual(mezclarJson(guardada, b.cambios as Objeto), guardada)) return false;
  if (b.orden) {
    // productosTienda ya viene en el orden del catálogo.
    const enOrden = productos.map((p) => p.id);
    if (!igual(enOrden.filter((id) => b.orden!.includes(id)), b.orden.filter((id) => enOrden.includes(id)))) return false;
  }
  return Object.entries(b.opiniones).every(([id, ops]) => igual(productos.find((p) => p.id === id)?.opiniones ?? [], ops));
}

/** Aviso de contraste (AA) de un color contra su pareja; null si se lee bien. */
export function avisoContraste(clave: ClaveColor, colores: Record<string, string>): string | null {
  const bg = colores.bg ?? "#FFFFFF";
  if (clave === "ink" || clave === "bg") {
    const c = contraste(colores.ink ?? "#000000", bg);
    return c < 4.5 ? `El texto sobre el fondo no llega a AA (${c.toFixed(1)}:1, hace falta 4.5:1).` : null;
  }
  if (clave === "accent") {
    const c = contraste(colores.accent ?? "#000000", "#FFFFFF");
    return c < 4.5 ? `Las letras blancas del botón no llegan a AA (${c.toFixed(1)}:1, hace falta 4.5:1).` : null;
  }
  const c = contraste(colores.heart ?? "#000000", bg);
  return c < 3 ? `El corazón casi no se ve sobre el fondo (${c.toFixed(1)}:1, hace falta 3:1).` : null;
}

export { modoOpiniones, type ModoOpiniones };
/** Cómo se guarda cada modo de opiniones (la base solo admite booleanos en secciones). */
export function seccionesOpiniones(modo: ModoOpiniones): Objeto {
  return modo === "si" ? { opiniones: true, opiniones_pronto: null } : modo === "pronto" ? { opiniones: true, opiniones_pronto: true } : { opiniones: false, opiniones_pronto: null };
}
