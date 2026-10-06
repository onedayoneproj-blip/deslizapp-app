// El taller de fotos en la demo (la misma regla que la RPC pedir_retoque): una foto ya guardada del producto, sin retocar,
// que no esté esperando, y con saldo libre (saldo menos lo reservado por las que esperan). Los créditos se reservan; se cobran
// cuando el equipo la entrega. Sin imports de valores de React: se prueba con node.

import type { TrabajoRetoque } from "../admin/tipos";
import { CREDITOS_POR_RETOQUE } from "../config";
import type { DB } from "./db";
import { CreditosInsuficientes, DatosInvalidos } from "./errores";

/** Días que la tienda sigue viendo una foto entregada o devuelta. */
export const DIAS_TALLER_VISIBLE = 30;

/** Créditos reservados por las fotos que esperan en el taller. */
export function creditosReservados(trabajos: TrabajoRetoque[], tiendaId: string): number {
  return trabajos.filter((t) => t.tiendaId === tiendaId && t.estado === "pendiente").reduce((n, t) => n + t.creditos, 0);
}

/** Una URL ya guardada (no un borrador del navegador): solo esas se pueden mandar al taller. */
export function fotoGuardada(url: string): boolean {
  return !url.startsWith("blob:") && !(url.startsWith("data:") && !url.startsWith("data:image/"));
}

export function pedirRetoqueEnDB(db: DB, tiendaId: string, productoId: string, medioUrl: string, ahora: string, id: string, pedidoPor: string | null) {
  const producto = db.productos.find((p) => p.id === productoId && p.tiendaId === tiendaId && !p.eliminadoEn);
  if (!producto) throw new DatosInvalidos("Ese producto ya no está en tu tienda.");
  const foto = producto.medios.find((m) => m.tipo === "foto" && m.url === medioUrl);
  if (!foto || foto.tipo !== "foto") throw new DatosInvalidos("Esa foto ya no está en el producto. Guarda y vuelve a intentarlo.");
  if (foto.retocada) throw new DatosInvalidos("Esa foto ya salió del taller.");
  const trabajos = db.trabajosRetoque ?? [];
  if (trabajos.some((t) => t.productoId === productoId && t.medioUrlOriginal === medioUrl && t.estado === "pendiente"))
    throw new DatosInvalidos("Esa foto ya está en el taller.");
  const tienda = db.tiendas.find((t) => t.id === tiendaId);
  if (!tienda) throw new DatosInvalidos("No encontramos tu tienda. Vuelve a entrar.");
  const libre = tienda.creditosRetoque - creditosReservados(trabajos, tiendaId);
  if (libre < CREDITOS_POR_RETOQUE) throw new CreditosInsuficientes(libre, CREDITOS_POR_RETOQUE);
  const trabajo: TrabajoRetoque = {
    id,
    tiendaId,
    productoId,
    medioUrlOriginal: medioUrl,
    medioUrlRetocado: null,
    estado: "pendiente",
    motivoDevolucion: null,
    creditos: CREDITOS_POR_RETOQUE,
    pedidoPor,
    atendidoPor: null,
    creadoEn: ahora,
    atendidoEn: null,
  };
  return { db: { ...db, trabajosRetoque: [...trabajos, trabajo] }, trabajo };
}

/** Las que esperan y las atendidas en los últimos DIAS_TALLER_VISIBLE días, de la más nueva a la más vieja. */
export function trabajosDeTienda(trabajos: TrabajoRetoque[], tiendaId: string, ahora: number): TrabajoRetoque[] {
  const corte = ahora - DIAS_TALLER_VISIBLE * 86_400_000;
  return trabajos
    .filter((t) => t.tiendaId === tiendaId && (t.estado === "pendiente" || Date.parse(t.atendidoEn ?? t.creadoEn) >= corte))
    .sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn));
}

export type EstadoFotoTaller =
  | { estado: "pendiente"; trabajo: TrabajoRetoque }
  | { estado: "devuelto"; trabajo: TrabajoRetoque }
  | { estado: "entregado"; trabajo: TrabajoRetoque }
  | null;

/**
 * Lo que la miniatura de una foto muestra del taller. La entregada se reconoce por su URL nueva (la foto ya cambió en el
 * producto); la que espera o fue devuelta, por la URL original. La más reciente gana.
 */
export function estadoFotoEnTaller(trabajos: TrabajoRetoque[], productoId: string, url: string): EstadoFotoTaller {
  const t = trabajos
    .filter((x) => x.productoId === productoId && (x.estado === "entregado" ? x.medioUrlRetocado === url : x.medioUrlOriginal === url))
    .sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))[0];
  return t ? ({ estado: t.estado, trabajo: t } as EstadoFotoTaller) : null;
}
