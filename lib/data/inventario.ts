import type { AjusteInventario, MotivoAjusteInventario, Producto, CambiosProducto, PropuestaInventario } from "../types";
import { DatosInvalidos, InventarioCambio } from "./errores.ts";
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
): { db: DB; producto: Producto; ajuste: AjusteInventario } {
  const producto = db.productos.find((p) => p.id === productoId && p.tiendaId === tiendaId);
  if (!producto) throw new DatosInvalidos("Ese producto no existe en esta tienda.");
  const cambio = validarAjusteInventario(producto.stock, variacion, motivo, nota);
  const actualizado = { ...producto, stock: cambio.stockNuevo, actualizadoEn: creadoEn };
  const ajuste: AjusteInventario = {
    id,
    tiendaId,
    productoId,
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


export function guardarProductoEnDB(db: DB, tiendaId: string, productoId: string, cambios: Omit<CambiosProducto, "stock">, propuesta: PropuestaInventario | null, actorId: string, creadoEn: string) {
  const actual = db.productos.find(p => p.id === productoId && p.tiendaId === tiendaId);
  if (!actual) throw new DatosInvalidos("Ese producto no existe en esta tienda.");
  if ("stock" in cambios) throw new DatosInvalidos("El stock necesita un ajuste registrado.");
  const previo = propuesta && db.ajustesInventario.find(a => a.id === propuesta.id);
  if (previo) {
    if (previo.tiendaId !== tiendaId || previo.productoId !== productoId || previo.actorId !== actorId || previo.stockAnterior !== propuesta.stockBase || previo.stockNuevo !== propuesta.stockPropuesto || previo.motivo !== propuesta.motivo || previo.nota !== (propuesta.nota?.trim() || null)) throw new DatosInvalidos("Ese ajuste ya pertenece a otro guardado.");
    return { db, producto: actual };
  }
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
