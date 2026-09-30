// Ventas a crédito y abonos en la demo (la misma regla que las RPC registrar_abono y eliminar_abono de Supabase).
// Las cuentas (repartir, deuda, atraso) viven en lib/credito.ts; aquí solo se aplican sobre la base en memoria.

import { conPago, cuentaDeCliente, cuentasPorCobrar, planearAbono, type CuentaCliente, type CuentasPorCobrar, type DatosAbono, type ErrorAbono, type PedidoPago } from "../credito";
import type { Abono } from "../types";
import type { DB } from "./db";
import { DatosInvalidos, MontoMayorQueDeuda, PedidoConAbonos } from "./errores";
import { abonosDePedido } from "./pedidos";

export { PedidoConAbonos };

export type NuevoAbono = DatosAbono & { tiendaId: string };

/** Los pedidos de la tienda con su estado de pago. */
export function pedidosConPago(db: DB, tiendaId: string): PedidoPago[] {
  return db.pedidos.filter((p) => p.tiendaId === tiendaId).map((p) => conPago(p, abonosDePedido(db, p.id)));
}

const MENSAJES: Record<Exclude<ErrorAbono["error"], "monto_mayor_que_deuda">, string> = {
  monto_invalido: "El monto del abono no es válido: escribe un número entero mayor que cero.",
  metodo_invalido: "Elige cómo te pagó: efectivo, transferencia u otro.",
  nota_invalida: "La nota es muy larga (máximo 200 caracteres).",
  fecha_invalida: "Esa fecha no sirve: elige un día que ya pasó.",
  sin_deuda: "No hay nada pendiente por abonar: ya está al día.",
  pedido_no_encontrado: "Ese pedido ya no existe en tu tienda.",
  cliente_no_encontrado: "Ese cliente ya no existe en tu tienda.",
};

/** El error que ve el dueño (el mismo texto que la traducción de los errores de la base). */
export function errorDeAbono(e: ErrorAbono): Error {
  return e.error === "monto_mayor_que_deuda" ? new MontoMayorQueDeuda(e.deuda) : new DatosInvalidos(MENSAJES[e.error]);
}

/** Registra un abono: a un pedido, o repartido del más viejo al más nuevo entre los pedidos a crédito del cliente. */
export function registrarAbonoDemo(db: DB, datos: NuevoAbono, nuevoId: () => string, ahora: string): { db: DB; abonos: Abono[] } {
  const clienteExiste = db.clientes.some((c) => c.id === datos.clienteId && c.tiendaId === datos.tiendaId);
  const plan = planearAbono(pedidosConPago(db, datos.tiendaId), datos, Date.parse(ahora), clienteExiste);
  if ("error" in plan) throw errorDeAbono(plan);
  const abonos: Abono[] = plan.aplicados.map((a) => ({
    id: nuevoId(),
    tiendaId: datos.tiendaId,
    pedidoId: a.pedidoId,
    monto: a.monto,
    metodo: datos.metodo,
    fecha: plan.fecha,
    nota: plan.nota,
    creadoEn: ahora,
  }));
  return { db: { ...db, abonos: [...db.abonos, ...abonos] }, abonos };
}

/** Borra un abono registrado por error (la deuda vuelve a subir). */
export function quitarAbonoDemo(db: DB, tiendaId: string, abonoId: string): DB {
  if (!db.abonos.some((a) => a.id === abonoId && a.tiendaId === tiendaId)) throw new DatosInvalidos("Ese abono ya no existe. Actualiza la pantalla.");
  return { ...db, abonos: db.abonos.filter((a) => a.id !== abonoId) };
}

export function cuentasDeTienda(db: DB, tiendaId: string, ahora: number): CuentasPorCobrar {
  const clientes = db.clientes.filter((c) => c.tiendaId === tiendaId);
  return cuentasPorCobrar(pedidosConPago(db, tiendaId), clientes, ahora);
}

export function cuentaDelCliente(db: DB, tiendaId: string, clienteId: string, ahora: number): CuentaCliente {
  return cuentaDeCliente(pedidosConPago(db, tiendaId), clienteId, ahora);
}
