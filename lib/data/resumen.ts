import type { EventoAaah } from "../types";
import type { AjusteFecha, DB } from "./db";

// Los agregados del Resumen (aaahs de la semana, conversión, top 3) llegan en el paso 9.

export type FilaEventoAaah = {
  id: string;
  tienda_id: string;
  producto_id: string;
  creado_en: string;
};

export function aEventoAaah(f: FilaEventoAaah, fecha: AjusteFecha): EventoAaah {
  return { id: f.id, tiendaId: f.tienda_id, productoId: f.producto_id, creadoEn: fecha(f.creado_en) };
}

export function eventosAaahDeTienda(db: DB, tiendaId: string): EventoAaah[] {
  return db.eventosAaah.filter((e) => e.tiendaId === tiendaId);
}
