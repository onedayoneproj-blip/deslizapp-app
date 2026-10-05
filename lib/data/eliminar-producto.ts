import type { DB } from "./db";

export type RevisionEliminacionProducto = {
  pedidosPendientes: number;
  solicitudesPendientes: number;
  avisosPendientes: number;
  conHistorial: boolean;
};

/** No borra relaciones ni medios: los pedidos conservan sus snapshots y sus referencias. */
export function revisarEliminacionProducto(db: DB, tiendaId: string, id: string, ahora: string): RevisionEliminacionProducto {
  if (!db.productos.some(p => p.id === id && p.tiendaId === tiendaId)) throw new Error("producto_no_encontrado");
  const pedidos = db.pedidos.filter(p => p.tiendaId === tiendaId && db.pedidoItems.some(i => i.pedidoId === p.id && i.productoId === id));
  const solicitudes = db.solicitudes.filter(s => s.tiendaId === tiendaId && s.items.some(i => i.productoId === id));
  return {
    pedidosPendientes: pedidos.filter(p => p.estado === "nuevo" || p.estado === "por_despachar").length,
    solicitudesPendientes: solicitudes.filter(s => !s.pedidoId && !s.descartadaEn && Date.parse(s.venceEn) >= Date.parse(ahora)).length,
    avisosPendientes: db.avisos.filter(a => a.tiendaId === tiendaId && a.productoId === id && !a.avisadoEn).length,
    conHistorial: pedidos.length > 0 || solicitudes.length > 0 || db.ajustesInventario.some(a => a.tiendaId === tiendaId && a.productoId === id),
  };
}

export function eliminarProductoDeDB(db: DB, tiendaId: string, id: string, ahora: string): DB {
  const p = db.productos.find(p => p.id === id && p.tiendaId === tiendaId);
  if (!p) throw new Error("producto_no_encontrado");
  if (p.eliminadoEn) return db; // Relectura/reintento explícito de una respuesta incierta.
  const r = revisarEliminacionProducto(db, tiendaId, id, ahora);
  if (r.pedidosPendientes || r.solicitudesPendientes || r.avisosPendientes) throw new Error("producto_con_pendientes");
  return { ...db, productos: db.productos.map(p => p.id === id && p.tiendaId === tiendaId ? { ...p, activo: false, eliminadoEn: ahora, actualizadoEn: ahora } : p) };
}
