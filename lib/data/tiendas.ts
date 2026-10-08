import type { EstiloMarca } from "../marca";
import { errorDeRubros, productosConTipoQuitado, type Rubro } from "../rubros";
import { enlaceAlPublicar, faltanParaPublicar } from "../publicar-catalogo";
import type { Tienda, Usuario } from "../types";
import type { DB } from "./db";
import { CreditosInsuficientes, DatosInvalidos, mensajeRubroEnUso } from "./errores";

export { CreditosInsuficientes };

export function listarTiendas(db: DB): Tienda[] {
  return [...db.tiendas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function buscarTienda(db: DB, tiendaId: string): Tienda | null {
  return db.tiendas.find((t) => t.id === tiendaId) ?? null;
}

/** Descuenta créditos de retoque. Falla si no alcanzan (el saldo nunca queda negativo). */
export function descontarCreditos(db: DB, tiendaId: string, cantidad: number) {
  const actual = buscarTienda(db, tiendaId);
  if (!actual) throw new Error("Esa tienda no existe.");
  if (actual.creditosRetoque < cantidad) throw new CreditosInsuficientes(actual.creditosRetoque, cantidad);
  const tienda: Tienda = { ...actual, creditosRetoque: actual.creditosRetoque - cantidad };
  return { db: { ...db, tiendas: db.tiendas.map((t) => (t.id === tiendaId ? tienda : t)) }, tienda };
}

export function buscarDueno(db: DB, tiendaId: string): Usuario | null {
  return db.usuarios.find((u) => u.tiendaId === tiendaId && u.rol === "dueno") ?? null;
}

/**
 * «Lo que vendes» (RPC `guardar_rubros_tienda`): el primero es el principal. Quitar un tipo que algún producto usa no se puede:
 * el mensaje dice cuáles (decisión: se bloquea, no se pasan solos al principal).
 */
export function modificarRubros(db: DB, tiendaId: string, rubros: Rubro[]) {
  const actual = buscarTienda(db, tiendaId);
  if (!actual) throw new Error("Esa tienda no existe.");
  const malo = errorDeRubros(rubros);
  if (malo) throw new DatosInvalidos(malo);
  const usan = productosConTipoQuitado(db.productos.filter((p) => p.tiendaId === tiendaId), rubros);
  if (usan.length) throw new DatosInvalidos(mensajeRubroEnUso(usan.map((p) => p.nombre)));
  const tienda: Tienda = { ...actual, rubro: rubros[0]!, rubros };
  return { db: { ...db, tiendas: db.tiendas.map((t) => (t.id === tiendaId ? tienda : t)) }, tienda };
}

export type DatosMarca = {
  logoUrl: string | null;
  principal: string;
  acento: string;
  estilo: EstiloMarca;
  urlCatalogo: string | null;
};

/** "Mi marca": logo, colores, estilo y enlace del catálogo de la tienda. */
export function modificarMarca(db: DB, tiendaId: string, datos: DatosMarca) {
  const actual = buscarTienda(db, tiendaId);
  if (!actual) throw new Error("Esa tienda no existe.");
  const tienda: Tienda = {
    ...actual,
    logoUrl: datos.logoUrl,
    marcaColorPrincipal: datos.principal,
    marcaColorAcento: datos.acento,
    marcaEstilo: datos.estilo,
    urlCatalogo: datos.urlCatalogo,
  };
  return { db: { ...db, tiendas: db.tiendas.map((t) => (t.id === tiendaId ? tienda : t)) }, tienda };
}

// ---- Catálogo en línea (la demo hace las mismas transiciones que las RPC de Supabase) ----

export const NOTAS_MAX = 500;
/** Enlace de ejemplo que la demo pone cuando el catálogo llega a "listo para revisar". */
export const ENLACE_EJEMPLO = "https://example.com/catalogo";

function tiendaDelCatalogo(db: DB, tiendaId: string): Tienda {
  const t = buscarTienda(db, tiendaId);
  if (!t || t.estado === "eliminada") throw new DatosInvalidos("No encontramos tu tienda. Vuelve a entrar.");
  return t;
}

function conTienda(db: DB, tienda: Tienda) {
  return { db: { ...db, tiendas: db.tiendas.map((t) => (t.id === tienda.id ? tienda : t)) }, tienda };
}

const ESTADO_INVALIDO = "Tu catálogo ya cambió de estado. Actualiza la pantalla para ver dónde va.";

/** sin → solicitado (RPC `solicitar_catalogo`). */
export function pedirCatalogo(db: DB, tiendaId: string, ahora: string) {
  const t = tiendaDelCatalogo(db, tiendaId);
  if (t.catalogoEstado !== "sin") throw new DatosInvalidos(ESTADO_INVALIDO);
  return conTienda(db, { ...t, catalogoEstado: "solicitado", catalogoSolicitadoEn: ahora });
}

/** revisar → cambios, con las notas del dueño (RPC `pedir_cambios_catalogo`). */
export function pedirCambiosDelCatalogo(db: DB, tiendaId: string, notas: string) {
  const limpias = notas.trim();
  if (!limpias || limpias.length > NOTAS_MAX) throw new DatosInvalidos("Cuéntanos qué quieres cambiar (hasta 500 caracteres).");
  const t = tiendaDelCatalogo(db, tiendaId);
  if (t.catalogoEstado !== "revisar") throw new DatosInvalidos(ESTADO_INVALIDO);
  return conTienda(db, { ...t, catalogoEstado: "cambios", catalogoNotasCambios: limpias });
}

/** revisar → publicado; exige el enlace (RPC `publicar_catalogo`). */
export function publicarElCatalogo(db: DB, tiendaId: string, ahora: string) {
  const t = tiendaDelCatalogo(db, tiendaId);
  if (t.catalogoEstado !== "revisar") throw new DatosInvalidos(ESTADO_INVALIDO);
  if (!t.urlCatalogo) throw new DatosInvalidos("Todavía no tenemos el enlace de tu catálogo. Escríbenos y lo conectamos.");
  return conTienda(db, { ...t, catalogoEstado: "publicado", catalogoPublicadoEn: ahora, catalogoNotasCambios: null });
}

/** sin → publicado, de una vez (RPC `publicar_mi_catalogo`): exige el mínimo de productos con foto; ya publicado no hace nada. */
export function publicarMiCatalogoEnDB(db: DB, tiendaId: string, ahora: string) {
  const t = tiendaDelCatalogo(db, tiendaId);
  if (t.estado === "pausada") throw new DatosInvalidos("Tu tienda está en pausa. Actívala con tu plan para publicar tu catálogo.");
  if (t.catalogoEstado === "publicado") return { db, tienda: t };
  if (t.catalogoEstado !== "sin") throw new DatosInvalidos("Tu catálogo ya va en camino con nuestro equipo. Actualiza la pantalla para ver dónde va.");
  if (faltanParaPublicar(db.productos.filter((p) => p.tiendaId === t.id)) > 0) {
    throw new DatosInvalidos("Todavía te faltan productos con foto para publicar tu catálogo. Agrégalos y vuelve.");
  }
  return conTienda(db, {
    ...t,
    catalogoEstado: "publicado",
    catalogoPublicadoEn: t.catalogoPublicadoEn ?? ahora,
    catalogoNotasCambios: null,
    urlCatalogo: enlaceAlPublicar(t.slug),
  });
}

/** publicado → sin (RPC `despublicar_mi_catalogo`): conserva el enlace y el primer momento publicado. */
export function despublicarMiCatalogoEnDB(db: DB, tiendaId: string) {
  const t = tiendaDelCatalogo(db, tiendaId);
  if (t.catalogoEstado === "sin") return { db, tienda: t };
  if (t.catalogoEstado !== "publicado") throw new DatosInvalidos(ESTADO_INVALIDO);
  return conTienda(db, { ...t, catalogoEstado: "sin" });
}

/**
 * SOLO DEMO: hace de "el equipo". sin → solicitado → generando (paso 1) → paso 2 → paso 3 → revisar (con un enlace de ejemplo si no
 * hay) y cambios → revisar. En los demás estados no hace nada.
 */
export function avanzarCatalogoDemo(db: DB, tiendaId: string) {
  const t = tiendaDelCatalogo(db, tiendaId);
  // Desde «sin» la demo arranca el flujo del equipo (la dueña ya publica sola, así que ya no hay un botón «Pedirlo»).
  if (t.catalogoEstado === "sin") return conTienda(db, { ...t, catalogoEstado: "solicitado", catalogoSolicitadoEn: new Date().toISOString() });
  if (t.catalogoEstado === "solicitado") return conTienda(db, { ...t, catalogoEstado: "generando", catalogoPaso: 1 });
  if (t.catalogoEstado === "generando") {
    const paso = t.catalogoPaso ?? 1;
    if (paso < 3) return conTienda(db, { ...t, catalogoPaso: paso + 1 });
    return conTienda(db, { ...t, catalogoEstado: "revisar", catalogoPaso: null, urlCatalogo: t.urlCatalogo ?? ENLACE_EJEMPLO });
  }
  if (t.catalogoEstado === "cambios") return conTienda(db, { ...t, catalogoEstado: "revisar", urlCatalogo: t.urlCatalogo ?? ENLACE_EJEMPLO });
  return { db, tienda: t };
}
