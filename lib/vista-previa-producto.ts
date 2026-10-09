// «Vista previa» (docs/prompts/presentaciones-por-pasos.md §8): el borrador de la hoja de producto convertido a `ProductoPublico`, la
// misma forma que lee el catálogo del comprador, para montar el mismo reel con lo que aún no se guarda. Lógica pura.
import { disponibilidad } from "./data/catalogo";
import { claveVariante, type Presentacion } from "./presentaciones";
import type { Detalles, Rubro } from "./rubros";
import type { CatalogoPublico, FotosPorValor, Medio, OpcionProducto, Producto, ProductoPublico, Tienda } from "./types";

/** Lo que el dueño tiene en la hoja de producto ahora mismo (sin guardar). */
export type BorradorPublico = {
  nombre: string;
  precio: number;
  medios: Medio[];
  detalles: Detalles;
  opciones: OpcionProducto[];
  presentaciones: Presentacion[];
  stock: number | null;
  porEncargo: boolean;
  encargoTexto: string;
  categoria: string | null;
  rubro: Rubro;
  /** Las fotos de cada color ya guardadas con una url (las que aún no se suben no se ven). */
  fotosPorValor?: FotosPorValor;
  fichaUrl: string | null;
};

/** El stock que ve el público: el de las presentaciones activas si las hay (null si alguna no lleva la cuenta). */
function stockPublico(b: BorradorPublico, activas: Presentacion[]): number | null {
  if (activas.length === 0) return b.stock;
  if (activas.some((p) => p.stock === null)) return null;
  return activas.reduce((s, p) => s + (p.stock ?? 0), 0);
}

/**
 * El producto del borrador como lo vería quien compra. Sin datos que el borrador no tiene: sin likes, sin opiniones, sin promo y
 * sin orden (valores neutros). Cada presentación lleva como id su clave, que solo sirve dentro de la vista.
 */
export function productoPublicoDeBorrador(b: BorradorPublico): ProductoPublico {
  const conOpciones = b.opciones.length > 0 && b.presentaciones.length > 0;
  const activas = conOpciones ? b.presentaciones.filter((p) => p.activa) : [];
  const stock = stockPublico(b, activas);
  const disp = disponibilidad(stock, b.porEncargo);
  return {
    orden: null,
    opiniones: [],
    id: "vista-previa",
    slug: "vista-previa",
    nombre: b.nombre.trim() || "Sin nombre",
    tipo: "producto",
    rubro: b.rubro,
    categoria: b.categoria,
    precio: b.precio,
    precioPromo: null,
    promo: null,
    medios: b.medios,
    detalles: b.detalles,
    opciones: conOpciones ? b.opciones : [],
    fotosPorValor: conOpciones ? (b.fotosPorValor ?? {}) : {},
    fichaUrl: b.fichaUrl,
    likes: 0,
    disponibilidad: disp,
    quedan: disp === "quedan" ? stock : null,
    encargoTexto: b.porEncargo ? b.encargoTexto.trim() || null : null,
    variantes: activas.map((p) => {
      const dv = disponibilidad(p.stock, b.porEncargo);
      return {
        id: claveVariante(p.valores),
        valores: p.valores,
        precio: p.precio ?? b.precio,
        precioPromo: null,
        disponibilidad: dv,
        quedan: dv === "quedan" ? p.stock : null,
      };
    }),
  };
}

/** La tienda como la ve el comprador, con lo que el panel sabe de ella (lo que no sabe va neutro). */
export function tiendaPublicaDe(t: Tienda): CatalogoPublico["tienda"] {
  return {
    desde: t.creadoEn,
    ventas: null,
    slug: t.slug,
    nombre: t.nombre,
    logoUrl: t.logoUrl,
    fotoPerfilUrl: t.fotoPerfilUrl ?? null,
    marcaColorPrincipal: t.marcaColorPrincipal,
    marcaColorAcento: t.marcaColorAcento,
    marcaEstilo: t.marcaEstilo,
    personalizacion: t.personalizacion ?? {},
    whatsapp: t.whatsapp ?? null,
    instagram: t.instagram ?? null,
    descripcion: t.descripcion ?? null,
    nombreVendedora: t.nombreVendedora ?? null,
    rubro: t.rubro,
    rubros: t.rubros,
    indexable: false,
  };
}

/**
 * «Ver cómo queda» el catálogo entero (antes o después de publicar): los productos guardados como los vería quien compra, en el
 * orden del catálogo. Solo los visibles. Sin promos ni opiniones (valores neutros, como el borrador); los likes, los que tiene.
 */
export function productosPublicosDe(productos: Producto[], rubroTienda: Tienda["rubro"]): ProductoPublico[] {
  return productos
    .filter((p) => p.activo && !p.eliminadoEn)
    .sort((a, b) => (a.orden == null ? (b.orden == null ? 0 : -1) : b.orden == null ? 1 : a.orden - b.orden) || b.creadoEn.localeCompare(a.creadoEn) || a.id.localeCompare(b.id))
    .map((p) => {
      const activas = (p.variantes ?? []).filter((v) => v.activa);
      const stock = activas.length === 0 ? p.stock : activas.some((v) => v.stock === null) ? null : activas.reduce((s, v) => s + (v.stock ?? 0), 0);
      const disp = disponibilidad(stock, p.porEncargo);
      return {
        orden: p.orden ?? null,
        opiniones: [],
        id: p.id,
        slug: p.slug,
        nombre: p.nombre,
        tipo: p.tipo,
        rubro: p.rubro ?? rubroTienda,
        categoria: p.categoria,
        precio: p.precio,
        precioPromo: null,
        promo: null,
        medios: p.medios,
        detalles: p.detalles,
        opciones: activas.length > 0 ? p.opciones : [],
        fotosPorValor: activas.length > 0 ? (p.fotosPorValor ?? {}) : {},
        fichaUrl: p.fichaUrl ?? null,
        likes: p.likes,
        disponibilidad: disp,
        quedan: disp === "quedan" ? stock : null,
        encargoTexto: p.porEncargo ? p.encargoTexto : null,
        variantes: activas.map((v) => {
          const dv = disponibilidad(v.stock, p.porEncargo);
          return { id: v.id, valores: v.valores, precio: v.precio ?? p.precio, precioPromo: null, disponibilidad: dv, quedan: dv === "quedan" ? v.stock : null };
        }),
      };
    });
}
