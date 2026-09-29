import { normalizarTelefonoDO } from "../telefono";
import type { Cliente, ClienteConResumen, OrigenPedido } from "../types";
import type { AjusteFecha, DB } from "./db";

export type FilaCliente = {
  id: string;
  tienda_id: string;
  nombre: string;
  telefono: string | null;
  origen: string;
  primer_pedido_en: string;
  pedidos_count: number;
  nota: string | null;
};

export function aCliente(f: FilaCliente, fecha: AjusteFecha): Cliente {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    nombre: f.nombre,
    telefono: f.telefono,
    origen: f.origen as OrigenPedido,
    primerPedidoEn: fecha(f.primer_pedido_en),
    nota: f.nota,
  };
}

function conResumen(db: DB, cliente: Cliente): ClienteConResumen {
  const pedidos = db.pedidos.filter((p) => p.clienteId === cliente.id && p.tiendaId === cliente.tiendaId && p.estado !== "cancelado");
  return {
    ...cliente,
    pedidos: pedidos.length,
    totalGastado: pedidos.reduce((suma, p) => suma + p.total, 0),
    ultimaCompra: pedidos.reduce<string | null>((ultima, p) => (ultima === null || p.creadoEn > ultima ? p.creadoEn : ultima), null),
    repite: pedidos.length >= 2,
  };
}

/** Clientes de una tienda con su resumen, en orden alfabético. */
export function clientesDeTienda(db: DB, tiendaId: string): ClienteConResumen[] {
  return db.clientes
    .filter((c) => c.tiendaId === tiendaId)
    .map((c) => conResumen(db, c))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function clienteDeTienda(db: DB, tiendaId: string, id: string): ClienteConResumen | null {
  const cliente = db.clientes.find((c) => c.id === id && c.tiendaId === tiendaId);
  return cliente ? conResumen(db, cliente) : null;
}

/** El cliente de la tienda con ese teléfono (comparado ya normalizado), si existe. */
export function clientePorTelefono(db: DB, tiendaId: string, telefono: string | null): Cliente | null {
  const buscado = telefono ? normalizarTelefonoDO(telefono) ?? telefono : null;
  if (!buscado) return null;
  return db.clientes.find((c) => c.tiendaId === tiendaId && c.telefono && (normalizarTelefonoDO(c.telefono) ?? c.telefono) === buscado) ?? null;
}

/** Ya hay un cliente con ese WhatsApp en la tienda. */
export class ClienteDuplicado extends Error {
  constructor(public existente: Cliente) {
    super(`${existente.nombre} ya está en tus clientes con ese WhatsApp.`);
  }
}

export const MAX_NOTA = 200;

/** Nota limpia: sin espacios de sobra, máx. MAX_NOTA caracteres, null si queda vacía. */
export function limpiarNota(nota: string | null | undefined): string | null {
  const limpia = (nota ?? "").trim().slice(0, MAX_NOTA);
  return limpia === "" ? null : limpia;
}

/** "+ Cliente": nombre, WhatsApp dominicano y nota opcional. Lanza ClienteDuplicado si el teléfono ya existe en la tienda. */
export function insertarCliente(
  db: DB,
  tiendaId: string,
  datos: { nombre: string; telefono: string; nota?: string | null },
  id: string,
  ahora: string,
) {
  const nombre = datos.nombre.trim();
  const telefono = normalizarTelefonoDO(datos.telefono);
  if (!nombre) throw new Error("El cliente necesita un nombre.");
  if (!telefono) throw new Error("Ese WhatsApp no es un número dominicano válido.");
  const existente = clientePorTelefono(db, tiendaId, telefono);
  if (existente) throw new ClienteDuplicado(existente);
  const cliente: Cliente = { id, tiendaId, nombre, telefono, origen: "manual", primerPedidoEn: ahora, nota: limpiarNota(datos.nota) };
  return { db: { ...db, clientes: [...db.clientes, cliente] }, cliente };
}

/** Cambia (o borra, con vacío) la nota de un cliente de la tienda. */
export function modificarNotaCliente(db: DB, tiendaId: string, id: string, nota: string | null) {
  const actual = db.clientes.find((c) => c.id === id && c.tiendaId === tiendaId);
  if (!actual) throw new Error("Ese cliente no es de esta tienda.");
  const cliente: Cliente = { ...actual, nota: limpiarNota(nota) };
  return { db: { ...db, clientes: db.clientes.map((c) => (c.id === id ? cliente : c)) }, cliente };
}
