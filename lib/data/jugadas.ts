// Tu próxima jugada en la demo: las mismas reglas que crear_codigo_cliente y registrar_envio_jugada de la base
// (supabase/migrations/20261003200000_jugadas_codigos_y_envios.sql). Puro, con pruebas en tests/jugadas-datos.test.mjs.

import type { EnvioJugada, Promo, TipoEnvioJugada } from "../types";
import { codigoPropuesto, DIAS_MAX, finDelDiaEn, PATRON_CODIGO, PORCENTAJE_MAX, PORCENTAJE_MIN } from "../jugada-codigo.ts";
import { CodigoNoValido, DatosInvalidos, MENSAJE_CODIGO_EN_USO, MENSAJE_CODIGO_FORMATO } from "./errores.ts";
import type { DB } from "./db";

/** Cuántos días de envíos lee la app ("Le escribiste hace 3 días"). */
export const DIAS_ENVIOS = 30;
const DIA = 86_400_000;

/** Crea un código de un solo uso para un cliente. Sin `codigo`, lo arma con su nombre y el porcentaje. */
export function crearCodigoClienteEnDB(
  db: DB,
  tiendaId: string,
  clienteId: string,
  porcentaje: number,
  dias: number,
  codigo: string | null | undefined,
  id: string,
  ahora: number,
): { db: DB; promo: Promo } {
  if (!Number.isInteger(porcentaje) || porcentaje < PORCENTAJE_MIN || porcentaje > PORCENTAJE_MAX) throw new DatosInvalidos("El descuento va de 1 % a 90 %.");
  if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAX) throw new DatosInvalidos("El código puede durar de 1 a 90 días.");
  const cliente = db.clientes.find((c) => c.id === clienteId && c.tiendaId === tiendaId);
  if (!cliente) throw new DatosInvalidos("Ese cliente ya no está en tu tienda.");
  const enUso = db.promos.filter((p) => p.tiendaId === tiendaId && p.codigo && p.estado !== "terminada").map((p) => p.codigo!.toUpperCase());

  let final: string;
  const escrito = codigo?.trim();
  if (escrito) {
    final = escrito.toUpperCase();
    if (!PATRON_CODIGO.test(final)) throw new CodigoNoValido(MENSAJE_CODIGO_FORMATO);
    if (enUso.includes(final)) throw new CodigoNoValido(MENSAJE_CODIGO_EN_USO);
  } else {
    final = codigoPropuesto(cliente.nombre, porcentaje, enUso);
  }

  const promo: Promo = {
    id,
    tiendaId,
    tipo: "codigo",
    nombre: `Para ${cliente.nombre.trim()}`,
    valorPorcentaje: porcentaje,
    codigo: final,
    coleccion: null,
    productoId: null,
    fechaInicio: new Date(ahora).toISOString(),
    fechaFin: finDelDiaEn(ahora, dias),
    estado: "activa",
    limiteUsos: 1,
    pausada: false,
    clienteId,
  };
  return { db: { ...db, promos: [...db.promos, promo] }, promo };
}

/** Guarda que se abrió WhatsApp desde una jugada. Valida que todo sea de esa tienda (como la base). */
export function registrarEnvioEnDB(
  db: DB,
  tiendaId: string,
  datos: { clienteId: string; jugada: EnvioJugada["jugada"]; tipo: TipoEnvioJugada; promoId?: string | null; productoIds?: string[] },
  id: string,
  ahora: number,
): { db: DB; envio: EnvioJugada } {
  const { clienteId, jugada, tipo } = datos;
  const promoId = datos.promoId ?? null;
  const productoIds = datos.productoIds ?? [];
  if (!db.clientes.some((c) => c.id === clienteId && c.tiendaId === tiendaId)) throw new DatosInvalidos("Ese cliente ya no está en tu tienda.");
  if (tipo === "codigo") {
    const promo = db.promos.find((p) => p.id === promoId && p.tiendaId === tiendaId && p.tipo === "codigo");
    if (!promo || (promo.clienteId !== null && promo.clienteId !== clienteId)) throw new DatosInvalidos("Ese código no sirve para este cliente.");
  } else if (promoId !== null) {
    throw new DatosInvalidos("Ese código no sirve para este cliente.");
  }
  if (tipo === "productos") {
    const unicos = new Set(productoIds);
    const deLaTienda = productoIds.filter((pid) => db.productos.some((p) => p.id === pid && p.tiendaId === tiendaId));
    if (productoIds.length < 1 || productoIds.length > 3 || unicos.size !== productoIds.length || deLaTienda.length !== productoIds.length) {
      throw new DatosInvalidos("Elige de 1 a 3 productos de tu tienda.");
    }
  }
  const envio: EnvioJugada = {
    id,
    tiendaId,
    clienteId,
    jugada,
    tipo,
    promoId,
    productoIds: tipo === "productos" ? productoIds : [],
    enviadoEn: new Date(ahora).toISOString(),
  };
  return { db: { ...db, jugadaEnvios: [...db.jugadaEnvios, envio] }, envio };
}

/** Los envíos de la tienda en los últimos 30 días, del más nuevo al más viejo. */
export function enviosDeTienda(db: DB, tiendaId: string, ahora: number): EnvioJugada[] {
  const desde = ahora - DIAS_ENVIOS * DIA;
  return db.jugadaEnvios
    .filter((e) => e.tiendaId === tiendaId && Date.parse(e.enviadoEn) >= desde)
    .sort((a, b) => b.enviadoEn.localeCompare(a.enviadoEn));
}
