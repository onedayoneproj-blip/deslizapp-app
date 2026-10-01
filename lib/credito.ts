// Ventas a crédito y abonos: las cuentas, sin pantallas ni base de datos. Las usan igual la demo y Supabase.
// Sin imports de valores (solo tipos): se prueba directo con Node (tests/credito.test.mjs).
//
// Reglas (las mismas de la base, supabase/migrations/20260930150901_credito_y_abonos.sql):
// - Un pedido es "contado" (pagado = total, saldo = 0) o "credito" (pagado = suma de sus abonos, saldo = total − pagado).
// - Un pedido cancelado no genera deuda (saldo = 0).
// - Un abono sin pedido fijo se reparte entre los pedidos a crédito del cliente con saldo, del más viejo al más nuevo.
// - Los días (fecha acordada, atraso) se cuentan en hora de Santo Domingo (UTC−4 todo el año).

import type { Abono, EstadoPedido, MetodoAbono, PagoModo } from "./types";

// ---------------------------------------------------------------------------
// Días en Santo Domingo
// ---------------------------------------------------------------------------

const DESFASE_MS = -4 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const dos = (n: number) => String(n).padStart(2, "0");

/** "AAAA-MM-DD" del día de Santo Domingo en el que cae `ms`. */
export function diaDeSantoDomingo(ms: number): string {
  const l = new Date(ms + DESFASE_MS);
  return `${l.getUTCFullYear()}-${dos(l.getUTCMonth() + 1)}-${dos(l.getUTCDate())}`;
}

const diaAMs = (dia: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
};

/** ¿Es un día real ("2026-02-31" no lo es)? */
export function esDiaValido(dia: string): boolean {
  const ms = diaAMs(dia);
  return !Number.isNaN(ms) && diaDeSantoDomingo(ms - DESFASE_MS) === dia;
}

/** Días de calendario de `desde` a `hasta` (positivo si `hasta` es después). */
export const diasEntre = (desde: string, hasta: string) => Math.round((diaAMs(hasta) - diaAMs(desde)) / DIA_MS);

/** El día `n` días después de `dia`. */
export function sumarDias(dia: string, n: number): string {
  const l = new Date(diaAMs(dia) + n * DIA_MS);
  return `${l.getUTCFullYear()}-${dos(l.getUTCMonth() + 1)}-${dos(l.getUTCDate())}`;
}

/** El último día del mes de `dia`. */
export function finDeMes(dia: string): string {
  const [a, m] = dia.split("-").map(Number) as [number, number];
  return diaDeSantoDomingo(Date.UTC(a, m, 1) - DIA_MS - DESFASE_MS);
}

/** Primer día del mes de `ms` (00:00 de Santo Domingo) como instante. */
export function inicioDeMes(ms: number): number {
  const l = new Date(ms + DESFASE_MS);
  return Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1) - DESFASE_MS;
}

/** Días que lleva atrasado un pedido cuya fecha acordada es `fecha`: 0 si todavía no pasó (el mismo día no es atraso). */
export function diasDeAtraso(fecha: string | null, ahora: number): number {
  if (!fecha || !esDiaValido(fecha)) return 0;
  return Math.max(0, diasEntre(fecha, diaDeSantoDomingo(ahora)));
}

/** Días que faltan para la fecha acordada: 0 = hoy; negativo si ya pasó. null sin fecha. */
export function diasParaPagar(fecha: string | null, ahora: number): number | null {
  if (!fecha || !esDiaValido(fecha)) return null;
  return diasEntre(diaDeSantoDomingo(ahora), fecha);
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-15" → "15 oct" (el día que quedó en pagar, sin hora ni zona). */
export function diaCorto(dia: string): string {
  const [, m, d] = /^\d{4}-(\d{2})-(\d{2})$/.exec(dia) ?? [];
  return m && d ? `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}` : dia;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "Atrasado 6 días" / "Atrasada 6 días" según `genero`. */
export const textoAtraso = (dias: number, genero: "o" | "a" = "o") => `Atrasad${genero} ${plural(dias, "día", "días")}`;

/** "Faltan 15 días" · "Falta 1 día" · "Vence hoy". */
export function textoFaltan(dias: number): string {
  if (dias <= 0) return "Vence hoy";
  return `${dias === 1 ? "Falta" : "Faltan"} ${plural(dias, "día", "días")}`;
}

// ---------------------------------------------------------------------------
// Saldo de un pedido
// ---------------------------------------------------------------------------

type Pago = { estado: EstadoPedido; total: number; pagoModo: PagoModo };

/** Lo pagado: contado = todo; crédito = suma de abonos. */
export function pagadoDe(pedido: Pick<Pago, "total" | "pagoModo">, abonos: { monto: number }[]): number {
  return pedido.pagoModo === "contado" ? pedido.total : abonos.reduce((suma, a) => suma + a.monto, 0);
}

/** Lo que falta por cobrar: solo pedidos a crédito que no están cancelados. Nunca negativo. */
export function saldoDe(pedido: Pago, abonos: { monto: number }[]): number {
  if (pedido.pagoModo !== "credito" || pedido.estado === "cancelado") return 0;
  return Math.max(0, pedido.total - pagadoDe(pedido, abonos));
}

/** El pedido con su estado de pago: `pagado` y `saldo` salen de sus abonos. */
export function conPago<P extends Pago>(pedido: P, abonos: Abono[]): P & { pagado: number; saldo: number; abonos: Abono[] } {
  return { ...pedido, abonos, pagado: pagadoDe(pedido, abonos), saldo: saldoDe(pedido, abonos) };
}

/** Pedido con su estado de pago, en las cuentas de abajo. */
export type PedidoPago = Pago & {
  id: string;
  numero: number;
  clienteId: string | null;
  creadoEn: string;
  pagoFechaAcordada: string | null;
  pagado: number;
  saldo: number;
  abonos: Abono[];
};

/** Del más viejo al más nuevo (por fecha de creación y, si empatan, por número). */
const masViejoPrimero = (a: { creadoEn: string; numero: number }, b: { creadoEn: string; numero: number }) =>
  a.creadoEn.localeCompare(b.creadoEn) || a.numero - b.numero;

/** Pedidos a crédito con saldo, del más viejo al más nuevo. */
export const conSaldo = <P extends PedidoPago>(pedidos: P[]): P[] => pedidos.filter((p) => p.pagoModo === "credito" && p.saldo > 0).sort(masViejoPrimero);

/** La deuda de un conjunto de pedidos. */
export const deudaDe = (pedidos: PedidoPago[]) => pedidos.reduce((suma, p) => suma + p.saldo, 0);

/**
 * Reparte un abono entre los pedidos con saldo, del más viejo al más nuevo: a cada uno le toca lo que le falta hasta que se acaba
 * el monto. Devuelve lo aplicado a cada pedido y lo que sobró (0 si el monto no supera la deuda).
 */
export function repartirAbono(pedidos: PedidoPago[], monto: number): { aplicados: { pedidoId: string; monto: number }[]; sobrante: number } {
  let resto = monto;
  const aplicados: { pedidoId: string; monto: number }[] = [];
  for (const p of conSaldo(pedidos)) {
    if (resto <= 0) break;
    const parte = Math.min(resto, p.saldo);
    aplicados.push({ pedidoId: p.id, monto: parte });
    resto -= parte;
  }
  return { aplicados, sobrante: Math.max(0, resto) };
}

// ---------------------------------------------------------------------------
// Validación de lo que se escribe
// ---------------------------------------------------------------------------

/** Entero de pesos que escribió la persona ("1,500", "RD$ 1500", "1500.00" → 1500). Sin decimales ni negativos: "" y lo raro → 0. */
export function montoDeTexto(texto: string): number {
  const digitos = texto.split(/[.,]\d{1,2}$/)[0]!.replace(/\D/g, "");
  return digitos === "" ? 0 : Math.min(Number(digitos), 99_999_999);
}

export const METODOS: { id: MetodoAbono; texto: string }[] = [
  { id: "efectivo", texto: "Efectivo" },
  { id: "transferencia", texto: "Transferencia" },
  { id: "otro", texto: "Otro" },
];
export const nombreMetodo = (m: MetodoAbono) => METODOS.find((x) => x.id === m)?.texto ?? "Otro";

/** ¿Es un monto entero > 0? */
export const esMontoValido = (monto: number) => Number.isInteger(monto) && monto > 0;

// ---------------------------------------------------------------------------
// Cómo paga un pedido nuevo o editado
// ---------------------------------------------------------------------------

export type AbonoInicial = { monto: number; metodo: MetodoAbono };

/** Lo que el formulario manda sobre el pago (crear pedido, venta pasada y editar pedido). Sin nada = contado. */
export type DatosPago = {
  pagoModo?: PagoModo;
  /** Día acordado ("AAAA-MM-DD") o null/ausente = sin fecha. Solo a crédito. */
  pagoFechaAcordada?: string | null;
  /** Lo que el cliente dio ahora. Solo a crédito; si iguala el total, el pedido queda de contado. */
  abonoInicial?: AbonoInicial | null;
};

/** Lo que se guarda: modo y fecha del pedido y, si hay, el abono inicial que se registra después de crearlo. */
export type PagoResuelto = { pagoModo: PagoModo; pagoFechaAcordada: string | null; abono: AbonoInicial | null };

/**
 * Decide cómo queda el pago de un pedido de `total`. A crédito con un abono inicial igual al total → contado (sin abono, sin
 * fecha). Un abono inicial mayor que el total, negativo o con decimales no es válido (`error`).
 */
export function resolverPago(total: number, datos: DatosPago): { resuelto: PagoResuelto; error: null } | { resuelto: null; error: string } {
  if (datos.pagoModo !== "credito") return { resuelto: { pagoModo: "contado", pagoFechaAcordada: null, abono: null }, error: null };
  const fecha = datos.pagoFechaAcordada ?? null;
  if (fecha !== null && !esDiaValido(fecha)) return { resuelto: null, error: "Esa fecha para pagar no sirve. Elige otro día o déjalo sin fecha." };
  const abono = datos.abonoInicial ?? null;
  if (abono) {
    if (!Number.isInteger(abono.monto) || abono.monto < 0) return { resuelto: null, error: "Lo que te dio ahora no es un monto válido." };
    if (abono.monto > total) return { resuelto: null, error: "Lo que te dio ahora no puede ser más que el total del pedido." };
  }
  if (abono && abono.monto === total && total > 0) return { resuelto: { pagoModo: "contado", pagoFechaAcordada: null, abono: null }, error: null };
  return { resuelto: { pagoModo: "credito", pagoFechaAcordada: fecha, abono: abono && abono.monto > 0 ? abono : null }, error: null };
}

// ---------------------------------------------------------------------------
// Registrar un abono (la misma regla de la RPC registrar_abono; la demo la usa tal cual)
// ---------------------------------------------------------------------------

export const NOTA_ABONO_MAX = 200;

export type DatosAbono = {
  clienteId: string;
  /** Con pedido, el abono va a ese pedido; sin él, se reparte entre los pedidos a crédito del cliente. */
  pedidoId?: string | null;
  monto: number;
  metodo: MetodoAbono;
  /** Cuándo pagó (ISO). Sin fecha = ahora. No puede ser futura. */
  fecha?: string | null;
  nota?: string | null;
};

export type ErrorAbono =
  | { error: "monto_invalido" | "metodo_invalido" | "nota_invalida" | "fecha_invalida" | "sin_deuda" | "pedido_no_encontrado" | "cliente_no_encontrado" }
  | { error: "monto_mayor_que_deuda"; deuda: number };

/**
 * Valida un abono y lo reparte: con `pedidoId` va todo a ese pedido; sin él, del pedido más viejo al más nuevo entre los
 * pedidos a crédito del cliente con saldo. Nunca deja pasar más de lo que se debe.
 */
export function planearAbono(
  pedidos: PedidoPago[],
  datos: DatosAbono,
  ahora: number,
  clienteExiste = true,
): { aplicados: { pedidoId: string; monto: number }[]; nota: string | null; fecha: string } | ErrorAbono {
  const nota = (datos.nota ?? "").trim() || null;
  if (!esMontoValido(datos.monto)) return { error: "monto_invalido" };
  if (!METODOS.some((m) => m.id === datos.metodo)) return { error: "metodo_invalido" };
  if (nota !== null && nota.length > NOTA_ABONO_MAX) return { error: "nota_invalida" };
  const ms = datos.fecha ? Date.parse(datos.fecha) : ahora;
  if (Number.isNaN(ms) || ms > ahora + DIA_MS) return { error: "fecha_invalida" };

  let alcance: PedidoPago[];
  if (datos.pedidoId) {
    alcance = pedidos.filter((p) => p.id === datos.pedidoId);
    if (alcance.length === 0) return { error: "pedido_no_encontrado" };
  } else {
    if (!clienteExiste) return { error: "cliente_no_encontrado" };
    alcance = pedidos.filter((p) => p.clienteId === datos.clienteId);
  }
  const deuda = deudaDe(alcance);
  if (deuda === 0) return { error: "sin_deuda" };
  if (datos.monto > deuda) return { error: "monto_mayor_que_deuda", deuda };
  return { aplicados: repartirAbono(alcance, datos.monto).aplicados, nota, fecha: new Date(ms).toISOString() };
}

// ---------------------------------------------------------------------------
// Cuentas por cobrar
// ---------------------------------------------------------------------------

type ClienteBasico = { id: string; nombre: string; telefono: string | null };

/** Lo que debe un cliente (o un pedido) y cómo va: para las filas de "Deben" y la cuenta del cliente. */
export type EstadoDeuda = {
  /** La fecha acordada más próxima entre sus pedidos con saldo (null si ninguno tiene). */
  fechaAcordada: string | null;
  /** Días de atraso (0 si no está atrasado). */
  atrasoDias: number;
  atrasado: boolean;
};

export function estadoDeDeuda(pedidosConSaldo: { pagoFechaAcordada: string | null }[], ahora: number): EstadoDeuda {
  const fechas = pedidosConSaldo.map((p) => p.pagoFechaAcordada).filter((f): f is string => !!f && esDiaValido(f)).sort();
  const fechaAcordada = fechas[0] ?? null;
  const atrasoDias = diasDeAtraso(fechaAcordada, ahora);
  return { fechaAcordada, atrasoDias, atrasado: atrasoDias > 0 };
}

export type CuentaPorCobrar = EstadoDeuda & {
  clienteId: string;
  nombre: string;
  telefono: string | null;
  /** Lo que debe en total. */
  deuda: number;
  /** Cuántos pedidos tienen saldo. */
  pedidos: number;
  /** El pedido con saldo más viejo. */
  pedidoMasViejo: { id: string; numero: number; creadoEn: string; /** Días desde que se hizo (hora de Santo Domingo). */ dias: number };
  /** Si tiene un solo pedido con saldo: sus datos ("Pedido #1006 · pagó RD$1,500 de 4,300"). */
  unico: { id: string; numero: number; pagado: number; total: number } | null;
};

export type CuentasPorCobrar = {
  cuentas: CuentaPorCobrar[];
  /** Todo lo que te deben. */
  total: number;
  clientes: number;
  pedidos: number;
  /** Suma de los abonos de este mes (hora de Santo Domingo). */
  cobradoEsteMes: number;
};

/** Primero atrasados (más días primero), luego con fecha (la más próxima primero), luego sin fecha (la deuda más vieja primero). */
export function ordenarCuentas(a: CuentaPorCobrar, b: CuentaPorCobrar): number {
  const grupo = (c: CuentaPorCobrar) => (c.atrasado ? 0 : c.fechaAcordada ? 1 : 2);
  const ga = grupo(a);
  const gb = grupo(b);
  if (ga !== gb) return ga - gb;
  if (ga === 0) return b.atrasoDias - a.atrasoDias || a.pedidoMasViejo.creadoEn.localeCompare(b.pedidoMasViejo.creadoEn);
  if (ga === 1) return a.fechaAcordada!.localeCompare(b.fechaAcordada!) || a.pedidoMasViejo.creadoEn.localeCompare(b.pedidoMasViejo.creadoEn);
  return a.pedidoMasViejo.creadoEn.localeCompare(b.pedidoMasViejo.creadoEn);
}

/** Los clientes que deben, con lo que deben, ordenados como los ve el dueño; y lo cobrado este mes. */
export function cuentasPorCobrar(pedidos: PedidoPago[], clientes: ClienteBasico[], ahora: number): CuentasPorCobrar {
  const porCliente = new Map<string, PedidoPago[]>();
  for (const p of conSaldo(pedidos)) {
    if (!p.clienteId) continue;
    porCliente.set(p.clienteId, [...(porCliente.get(p.clienteId) ?? []), p]);
  }
  const cuentas: CuentaPorCobrar[] = [];
  for (const [clienteId, lista] of porCliente) {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) continue;
    const viejo = lista[0]!; // conSaldo va del más viejo al más nuevo
    cuentas.push({
      clienteId,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      deuda: deudaDe(lista),
      pedidos: lista.length,
      pedidoMasViejo: {
        id: viejo.id,
        numero: viejo.numero,
        creadoEn: viejo.creadoEn,
        dias: Math.max(0, diasEntre(diaDeSantoDomingo(Date.parse(viejo.creadoEn)), diaDeSantoDomingo(ahora))),
      },
      unico: lista.length === 1 ? { id: viejo.id, numero: viejo.numero, pagado: viejo.pagado, total: viejo.total } : null,
      ...estadoDeDeuda(lista, ahora),
    });
  }
  cuentas.sort(ordenarCuentas);
  const desde = inicioDeMes(ahora);
  const cobradoEsteMes = pedidos
    .flatMap((p) => p.abonos)
    .filter((a) => Date.parse(a.fecha) >= desde && Date.parse(a.fecha) <= ahora + DIA_MS)
    .reduce((suma, a) => suma + a.monto, 0);
  return {
    cuentas,
    total: cuentas.reduce((suma, c) => suma + c.deuda, 0),
    clientes: cuentas.length,
    pedidos: cuentas.reduce((suma, c) => suma + c.pedidos, 0),
    cobradoEsteMes,
  };
}

/** Un renglón del historial de la cuenta: una compra a crédito o un abono. */
export type MovimientoCuenta =
  | { tipo: "compra"; pedidoId: string; numero: number; fecha: string; monto: number; pagoFechaAcordada: string | null }
  | { tipo: "abono"; abonoId: string; pedidoId: string; numero: number; fecha: string; monto: number; metodo: MetodoAbono; nota: string | null };

export type CuentaCliente = EstadoDeuda & {
  clienteId: string;
  /** Lo que debe en total (0 si está al día). */
  deuda: number;
  /** Los pedidos a crédito con saldo, del más viejo al más nuevo. */
  pedidos: { id: string; numero: number; creadoEn: string; total: number; pagado: number; saldo: number; pagoFechaAcordada: string | null }[];
  /** Compras a crédito y abonos mezclados, del más reciente al más viejo. */
  historial: MovimientoCuenta[];
};

/** La cuenta de un cliente: lo que debe, en qué pedidos y su historial de compras a crédito y abonos. */
export function cuentaDeCliente(pedidos: PedidoPago[], clienteId: string, ahora: number): CuentaCliente {
  const suyos = pedidos.filter((p) => p.clienteId === clienteId && p.pagoModo === "credito" && p.estado !== "cancelado");
  const pendientes = conSaldo(suyos);
  const historial: MovimientoCuenta[] = suyos.flatMap((p) => [
    { tipo: "compra" as const, pedidoId: p.id, numero: p.numero, fecha: p.creadoEn, monto: p.total, pagoFechaAcordada: p.pagoFechaAcordada },
    ...p.abonos.map((a) => ({
      tipo: "abono" as const,
      abonoId: a.id,
      pedidoId: p.id,
      numero: p.numero,
      fecha: a.fecha,
      monto: a.monto,
      metodo: a.metodo,
      nota: a.nota,
    })),
  ]);
  // Más reciente primero; en un empate, el abono va antes que la compra (así se lee "compró, y luego abonó" de abajo hacia arriba).
  historial.sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.tipo === "abono" ? -1 : 1) - (b.tipo === "abono" ? -1 : 1));
  return {
    clienteId,
    deuda: deudaDe(pendientes),
    pedidos: pendientes.map((p) => ({ id: p.id, numero: p.numero, creadoEn: p.creadoEn, total: p.total, pagado: p.pagado, saldo: p.saldo, pagoFechaAcordada: p.pagoFechaAcordada })),
    historial,
    ...estadoDeDeuda(pendientes, ahora),
  };
}

/** Cuánto llevó pagar un pedido saldado: el resumen de "¡Terminó de pagar!". */
export function resumenDeSaldado(pedido: { creadoEn: string; total: number; abonos: { fecha: string }[] }): { abonos: number; dias: number } {
  const ultimo = pedido.abonos.reduce((max, a) => (a.fecha > max ? a.fecha : max), pedido.creadoEn);
  return { abonos: pedido.abonos.length, dias: Math.max(0, diasEntre(diaDeSantoDomingo(Date.parse(pedido.creadoEn)), diaDeSantoDomingo(Date.parse(ultimo)))) };
}

// ---------------------------------------------------------------------------
// Recordatorio por WhatsApp (nunca se envía solo: lo abre el dueño)
// ---------------------------------------------------------------------------

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? "";
const pesos = (monto: number) => `RD$${monto.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** "¡Hola, Marleny! Te escribe Michel, de Esencias Michel. Te recuerdo con cariño que quedó pendiente RD$2,300. Cuando puedas me avisas. ¡Gracias!" */
export function mensajeRecordatorio(datos: { cliente: string; vendedora: string; tienda: string; deuda: number }): string {
  const de = datos.vendedora && datos.vendedora !== datos.tienda ? `${datos.vendedora}, de ${datos.tienda}` : datos.tienda;
  return `¡Hola, ${primerNombre(datos.cliente)}! Te escribe ${de}. Te recuerdo con cariño que quedó pendiente ${pesos(datos.deuda)}. Cuando puedas me avisas. ¡Gracias!`;
}

/** Mensaje de gracias al saldar. */
export function mensajeGracias(datos: { cliente: string; vendedora: string; tienda: string; total: number }): string {
  const de = datos.vendedora && datos.vendedora !== datos.tienda ? `${datos.vendedora}, de ${datos.tienda}` : datos.tienda;
  return `¡Hola, ${primerNombre(datos.cliente)}! Te escribe ${de}. Ya quedó saldado tu pedido de ${pesos(datos.total)}. ¡Mil gracias por tu compra y por cumplirme!`;
}

/** https://wa.me/<teléfono en dígitos, con 1 delante si tiene 10 dígitos>?text=… */
export function enlaceWhatsAppCliente(telefono: string, texto: string): string {
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) digitos = `1${digitos}`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}
