import type { AjusteInventario, MotivoAjusteInventario, Producto, CambiosProducto, PropuestaInventario, Variante } from "../types";
import { DatosInvalidos, InventarioCambio, UsarVariante } from "./errores.ts";
import type { DB } from "./db";

export function validarAjusteInventario(
  stock: number | null,
  variacion: number,
  motivo: MotivoAjusteInventario,
  nota?: string | null,
): { stockNuevo: number; nota: string | null } {
  if (stock === null) throw new DatosInvalidos("Este producto no lleva control de stock.");
  if (!Number.isSafeInteger(variacion) || variacion === 0) throw new DatosInvalidos("El ajuste debe cambiar al menos una unidad.");
  if (variacion > 0 && motivo !== "reposicion") throw new DatosInvalidos("Para aumentar el stock, elige reposición.");
  if (variacion < 0 && !["dano", "perdida", "correccion_inventario", "otro"].includes(motivo)) {
    throw new DatosInvalidos("Elige el motivo de la disminución.");
  }
  const limpio = nota?.trim() || null;
  if (motivo === "otro" && !limpio) throw new DatosInvalidos("Cuéntanos brevemente el motivo del ajuste.");
  if (limpio && limpio.length > 200) throw new DatosInvalidos("La nota no puede pasar de 200 caracteres.");
  const stockNuevo = stock + variacion;
  if (!Number.isSafeInteger(stockNuevo) || stockNuevo < 0 || stockNuevo > 2_147_483_647) {
    throw new DatosInvalidos(stockNuevo < 0 ? "El stock no puede quedar en negativo." : "Esa cantidad supera el límite permitido.");
  }
  return { stockNuevo, nota: limpio };
}

/** Lo máximo que acepta `reponer_stock` en una sola llamada (igual que la RPC). */
export const MAX_LINEAS_REPOSICION = 200;

export type LineaReposicion = { productoId: string; cantidad: number; varianteId?: string | null };

/** Las mismas reglas de la RPC `reponer_stock`, para avisar con claridad antes de llamarla (y en la demo). */
export function validarReposicion(items: LineaReposicion[]): void {
  if (items.length === 0) throw new DatosInvalidos("Marca al menos un producto para sumar al stock.");
  if (items.length > MAX_LINEAS_REPOSICION) throw new DatosInvalidos("Son demasiados productos de una vez. Hazlo en dos tandas.");
  const vistos = new Set<string>();
  for (const { productoId, cantidad, varianteId } of items) {
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) throw new DatosInvalidos("Cada cantidad debe ser de 1 o más.");
    const clave = `${productoId}:${varianteId ?? ""}`;
    if (vistos.has(clave)) throw new DatosInvalidos("Un producto aparece repetido en la lista.");
    vistos.add(clave);
  }
}

/** Actualiza stock y registro juntos dentro de una escritura de la demo. */
export function ajustarStockEnDB(
  db: DB,
  tiendaId: string,
  productoId: string,
  variacion: number,
  motivo: MotivoAjusteInventario,
  nota: string | null,
  actorId: string,
  id: string,
  creadoEn: string,
  varianteId: string | null = null,
): { db: DB; producto: Producto; ajuste: AjusteInventario } {
  const producto = db.productos.find((p) => p.id === productoId && p.tiendaId === tiendaId);
  if (!producto) throw new DatosInvalidos("Ese producto no existe en esta tienda.");
  const activas = db.variantes.filter((v) => v.productoId === productoId && v.activa);
  if (varianteId) return ajustarVarianteEnDB(db, producto, varianteId, variacion, motivo, nota, actorId, id, creadoEn);
  if (activas.length > 0) throw new UsarVariante();
  const cambio = validarAjusteInventario(producto.stock, variacion, motivo, nota);
  const actualizado = { ...producto, stock: cambio.stockNuevo, actualizadoEn: creadoEn };
  const ajuste: AjusteInventario = {
    id,
    tiendaId,
    productoId,
    varianteId: null,
    variacion,
    stockAnterior: producto.stock!,
    stockNuevo: cambio.stockNuevo,
    motivo,
    nota: cambio.nota,
    actorId,
    creadoEn,
  };
  return {
    db: {
      ...db,
      productos: db.productos.map((p) => (p.id === productoId && p.tiendaId === tiendaId ? actualizado : p)),
      ajustesInventario: [...db.ajustesInventario, ajuste],
    },
    producto: actualizado,
    ajuste,
  };
}


/** El ajuste de una variante: la variante cambia y el producto queda con la suma de las activas. */
function ajustarVarianteEnDB(
  db: DB,
  producto: Producto,
  varianteId: string,
  variacion: number,
  motivo: MotivoAjusteInventario,
  nota: string | null,
  actorId: string,
  id: string,
  creadoEn: string,
): { db: DB; producto: Producto; ajuste: AjusteInventario } {
  const variante = db.variantes.find((v) => v.id === varianteId && v.productoId === producto.id && v.activa);
  if (!variante) throw new DatosInvalidos("Esa variante ya no existe. Actualiza la pantalla.");
  const cambio = validarAjusteInventario(variante.stock, variacion, motivo, nota);
  const variantes = db.variantes.map((v) => (v.id === varianteId ? { ...v, stock: cambio.stockNuevo } : v));
  const actualizado = { ...sumarStock(producto, variantes), actualizadoEn: creadoEn };
  const ajuste: AjusteInventario = {
    id,
    tiendaId: producto.tiendaId,
    productoId: producto.id,
    varianteId,
    variacion,
    stockAnterior: variante.stock!,
    stockNuevo: cambio.stockNuevo,
    motivo,
    nota: cambio.nota,
    actorId,
    creadoEn,
  };
  return {
    db: { ...db, variantes, productos: db.productos.map((p) => (p.id === producto.id ? actualizado : p)), ajustesInventario: [...db.ajustesInventario, ajuste] },
    producto: actualizado,
    ajuste,
  };
}

export function guardarProductoEnDB(db: DB, tiendaId: string, productoId: string, cambios: Omit<CambiosProducto, "stock">, propuesta: PropuestaInventario | null, actorId: string, creadoEn: string) {
  const actual = db.productos.find(p => p.id === productoId && p.tiendaId === tiendaId);
  if (!actual) throw new DatosInvalidos("Ese producto no existe en esta tienda.");
  if ("stock" in cambios) throw new DatosInvalidos("El stock necesita un ajuste registrado.");
  const previo = propuesta && db.ajustesInventario.find(a => a.id === propuesta.id);
  if (previo) {
    if (previo.tiendaId !== tiendaId || previo.productoId !== productoId || previo.actorId !== actorId || previo.stockAnterior !== propuesta.stockBase || previo.stockNuevo !== propuesta.stockPropuesto || previo.motivo !== propuesta.motivo || previo.nota !== (propuesta.nota?.trim() || null)) throw new DatosInvalidos("Ese ajuste ya pertenece a otro guardado.");
    return { db, producto: actual };
  }
  if (propuesta && db.variantes.some((v) => v.productoId === productoId && v.activa)) throw new UsarVariante();
  if (propuesta && actual.stock !== propuesta.stockBase) throw new InventarioCambio();
  const ficha = { ...actual, ...cambios };
  if (!ficha.nombre.trim() || ficha.nombre.length > 120 || !Number.isInteger(ficha.precio) || ficha.precio <= 0) throw new DatosInvalidos("Revisa el nombre y el precio.");
  const r = propuesta && propuesta.stockPropuesto !== propuesta.stockBase
    ? ajustarStockEnDB(db, tiendaId, productoId, propuesta.stockPropuesto - propuesta.stockBase, propuesta.motivo, propuesta.nota, actorId, propuesta.id, creadoEn)
    : { db, producto: actual };
  const producto = { ...r.producto, ...cambios, actualizadoEn: creadoEn };
  return { db: { ...r.db, productos: r.db.productos.map(p => p.id === productoId && p.tiendaId === tiendaId ? producto : p) }, producto };
}

export const MOTIVOS_INVENTARIO: Record<MotivoAjusteInventario, string> = {
  reposicion: "Reposición", dano: "Daño", perdida: "Pérdida", correccion_inventario: "Corrección de inventario", otro: "Otro",
};

/** El stock del producto con variantes activas: la suma (null si ninguna lleva control). Sin activas no cambia. */
export function sumarStock(producto: Producto, variantes: Variante[]): Producto {
  const activas = variantes.filter((v) => v.productoId === producto.id && v.activa);
  if (activas.length === 0) return producto;
  const conControl = activas.filter((v) => v.stock !== null);
  return { ...producto, stock: conControl.length === 0 ? null : conControl.reduce((s, v) => s + v.stock!, 0) };
}
