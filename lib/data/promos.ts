import { diaAIso, validarPromo, type DatosPromo, type ErroresPromo } from "../promos";
import type { EstadoPromo, Promo, TipoPromo } from "../types";
import type { AjusteFecha, DB } from "./db";

export type FilaPromo = {
  id: string;
  tienda_id: string;
  tipo: string;
  nombre: string;
  valor_porcentaje: number | null;
  codigo: string | null;
  coleccion: string | null;
  producto_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
};

export function aPromo(f: FilaPromo, fecha: AjusteFecha): Promo {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    tipo: f.tipo as TipoPromo,
    nombre: f.nombre,
    valorPorcentaje: f.valor_porcentaje,
    codigo: f.codigo,
    coleccion: f.coleccion,
    productoId: f.producto_id,
    fechaInicio: fecha(f.fecha_inicio),
    fechaFin: f.fecha_fin == null ? null : fecha(f.fecha_fin),
    estado: f.estado as EstadoPromo,
  };
}

export function promosDeTienda(db: DB, tiendaId: string): Promo[] {
  return db.promos.filter((p) => p.tiendaId === tiendaId).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
}

/** El formulario de la promo tiene errores (los mismos que ve el dueño). */
export class PromoInvalida extends Error {
  constructor(public errores: ErroresPromo) {
    super("La promo tiene datos por corregir.");
  }
}

function desdeFormulario(tiendaId: string, datos: DatosPromo, id: string, ahora: Date): Promo {
  const fechaInicio = diaAIso(datos.inicio, "inicio");
  return {
    id,
    tiendaId,
    tipo: datos.tipo,
    nombre: datos.nombre.trim(),
    valorPorcentaje: Number(datos.porcentaje),
    codigo: datos.tipo === "codigo" ? datos.codigo : null,
    coleccion: datos.tipo === "coleccion" ? datos.coleccion : null,
    productoId: datos.tipo === "producto" ? datos.productoId : null,
    fechaInicio,
    fechaFin: datos.fin ? diaAIso(datos.fin, "fin") : null,
    // Se guarda lo que es hoy; el estado que se muestra siempre se calcula por fechas (lib/promos.ts)
    estado: Date.parse(fechaInicio) > ahora.getTime() ? "programada" : "activa",
  };
}

export function insertarPromo(db: DB, tiendaId: string, datos: DatosPromo, id: string, ahora: Date) {
  const errores = validarPromo(datos, db.promos, tiendaId);
  if (Object.keys(errores).length) throw new PromoInvalida(errores);
  const promo = desdeFormulario(tiendaId, datos, id, ahora);
  return { db: { ...db, promos: [...db.promos, promo] }, promo };
}

/** Edita una promo que no ha terminado (el tipo no cambia). */
export function modificarPromo(db: DB, tiendaId: string, id: string, datos: DatosPromo, ahora: Date) {
  const actual = db.promos.find((p) => p.id === id && p.tiendaId === tiendaId);
  if (!actual) throw new Error("Esa promo no es de esta tienda.");
  if (actual.estado === "terminada") throw new Error("Una promo terminada no se puede editar: duplícala como nueva.");
  const errores = validarPromo({ ...datos, tipo: actual.tipo }, db.promos, tiendaId, id);
  if (Object.keys(errores).length) throw new PromoInvalida(errores);
  const promo = desdeFormulario(tiendaId, { ...datos, tipo: actual.tipo }, id, ahora);
  return { db: { ...db, promos: db.promos.map((p) => (p.id === id ? promo : p)) }, promo };
}

/** La termina el dueño: queda `terminada` guardada (no se reactiva) y, si estaba corriendo, vence ahora. */
export function terminarPromoDeTienda(db: DB, tiendaId: string, id: string, ahora: Date) {
  const actual = db.promos.find((p) => p.id === id && p.tiendaId === tiendaId);
  if (!actual) throw new Error("Esa promo no es de esta tienda.");
  const corriendo = Date.parse(actual.fechaInicio) <= ahora.getTime();
  const promo: Promo = {
    ...actual,
    estado: "terminada",
    fechaFin: corriendo && (actual.fechaFin === null || Date.parse(actual.fechaFin) > ahora.getTime()) ? ahora.toISOString() : actual.fechaFin,
  };
  return { db: { ...db, promos: db.promos.map((p) => (p.id === id ? promo : p)) }, promo };
}
