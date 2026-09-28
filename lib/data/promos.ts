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
