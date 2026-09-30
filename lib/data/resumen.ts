import type { EventoAaah } from "../types";
import type { DB } from "./db";

export function eventosAaahDeTienda(db: DB, tiendaId: string): EventoAaah[] {
  return db.eventosAaah.filter((e) => e.tiendaId === tiendaId);
}
