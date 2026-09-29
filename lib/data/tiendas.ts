import type { EstiloMarca } from "../marca";
import type { Plan, RolUsuario, Tienda, Usuario } from "../types";
import type { AjusteFecha, DB } from "./db";

export type FilaTienda = {
  id: string;
  slug: string;
  nombre: string;
  logo_url: string | null;
  plan: string;
  limite_productos: number;
  creditos_retoque: number;
  creditos_retoque_mensuales: number;
  creado_en: string;
  marca_color_principal: string;
  marca_color_acento: string;
  marca_estilo: string;
  url_catalogo: string | null;
};

export type FilaUsuario = {
  id: string;
  tienda_id: string;
  email: string;
  nombre: string;
  rol: string;
};

export function aTienda(f: FilaTienda, fecha: AjusteFecha): Tienda {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    logoUrl: f.logo_url,
    plan: f.plan as Plan,
    limiteProductos: f.limite_productos,
    creditosRetoque: f.creditos_retoque,
    creditosRetoqueMensuales: f.creditos_retoque_mensuales,
    creadoEn: fecha(f.creado_en),
    marcaColorPrincipal: f.marca_color_principal,
    marcaColorAcento: f.marca_color_acento,
    marcaEstilo: f.marca_estilo as EstiloMarca,
    urlCatalogo: f.url_catalogo,
  };
}

export function aUsuario(f: FilaUsuario): Usuario {
  return { id: f.id, tiendaId: f.tienda_id, email: f.email, nombre: f.nombre, rol: f.rol as RolUsuario };
}

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

export class CreditosInsuficientes extends Error {
  constructor(
    public disponibles: number,
    public necesarios: number,
  ) {
    super(`Faltan créditos: hay ${disponibles}, se necesitan ${necesarios}.`);
  }
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
