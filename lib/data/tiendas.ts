import type { EstiloMarca } from "../marca";
import type { Tienda, Usuario } from "../types";
import type { DB } from "./db";
import { CreditosInsuficientes } from "./errores";

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
