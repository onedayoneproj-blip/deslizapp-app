// Ventas a crédito y abonos (lib/credito.ts): reparto, deuda, atraso en hora de Santo Domingo, cuentas por cobrar y mensajes.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  conPago,
  cuentaDeCliente,
  cuentasPorCobrar,
  diasDeAtraso,
  diasParaPagar,
  enlaceWhatsAppCliente,
  finDeMes,
  mensajeRecordatorio,
  mensajesRecordatorio,
  montoDeTexto,
  planearAbono,
  planearEdicionAbono,
  repartirAbono,
  resolverPago,
  resumenDeSaldado,
  saldoDe,
  sumarDias,
  textoAtraso,
  totalYAbonado,
  textoFechaDeuda,
  textoFechaDeudaAccesible,
  diaLargo,
  textoFaltan,
} from "../lib/credito.ts";
import { traducirErrorSupabase, MontoMayorQueDeuda, NotaClienteLarga, PedidoConAbonos } from "../lib/data/errores.ts";

const AHORA = Date.parse("2026-09-30T16:00:00.000Z"); // 30 sep, mediodía en Santo Domingo
let n = 0;
/** Un pedido a crédito con sus abonos ya sumados. */
const pedido = (numero, creadoEn, total, abonos = [], extra = {}) => {
  const base = { id: `p${numero}`, numero, clienteId: "c1", estado: "despachado", total, creadoEn, pagoModo: "credito", pagoFechaAcordada: null, ...extra };
  return conPago(base, abonos.map((monto) => ({ id: `a${++n}`, tiendaId: "t", pedidoId: base.id, monto, metodo: "efectivo", fecha: creadoEn, nota: null, creadoEn })));
};

test("el abono se reparte del pedido más viejo al más nuevo", () => {
  const nuevo = pedido(3, "2026-09-20T15:00:00Z", 1100);
  const viejo = pedido(1, "2026-09-04T15:00:00Z", 2000, [800]); // debe 1,200
  const medio = pedido(2, "2026-09-12T15:00:00Z", 500);
  const r = repartirAbono([nuevo, viejo, medio], 1500);
  assert.deepEqual(r.aplicados, [{ pedidoId: "p1", monto: 1200 }, { pedidoId: "p2", monto: 300 }]);
  assert.equal(r.sobrante, 0);
  // Con la misma fecha manda el número
  const a = pedido(11, "2026-09-04T15:00:00Z", 100);
  const b = pedido(10, "2026-09-04T15:00:00Z", 100);
  assert.deepEqual(repartirAbono([a, b], 150).aplicados, [{ pedidoId: "p10", monto: 100 }, { pedidoId: "p11", monto: 50 }]);
});

test("no se puede abonar más de lo que se debe", () => {
  const p = pedido(1, "2026-09-04T15:00:00Z", 2000, [800]);
  const r = planearAbono([p], { clienteId: "c1", monto: 1201, metodo: "efectivo" }, AHORA);
  assert.deepEqual(r, { error: "monto_mayor_que_deuda", deuda: 1200 });
  const ok = planearAbono([p], { clienteId: "c1", monto: 1200, metodo: "efectivo" }, AHORA);
  assert.deepEqual(ok.aplicados, [{ pedidoId: "p1", monto: 1200 }]);
  // También con pedido fijo y con el cliente completo
  assert.equal(planearAbono([p], { clienteId: "c1", pedidoId: "p1", monto: 1300, metodo: "otro" }, AHORA).error, "monto_mayor_que_deuda");
  assert.equal(new MontoMayorQueDeuda(1200).message, "Te debe RD$1,200; no puedes abonar más que eso.");
});

test("validaciones del abono: monto entero > 0, método, nota, fecha, deuda y pedido", () => {
  const p = pedido(1, "2026-09-04T15:00:00Z", 1000);
  const dato = (o) => planearAbono([p], { clienteId: "c1", monto: 100, metodo: "efectivo", ...o }, AHORA);
  assert.equal(dato({ monto: 0 }).error, "monto_invalido");
  assert.equal(dato({ monto: -5 }).error, "monto_invalido");
  assert.equal(dato({ monto: 10.5 }).error, "monto_invalido");
  assert.equal(dato({ metodo: "cheque" }).error, "metodo_invalido");
  assert.equal(dato({ nota: "x".repeat(201) }).error, "nota_invalida");
  assert.equal(dato({ fecha: "2026-10-05T12:00:00Z" }).error, "fecha_invalida");
  assert.equal(dato({ fecha: "2026-09-10T12:00:00Z" }).fecha, "2026-09-10T12:00:00.000Z");
  assert.equal(dato({ pedidoId: "nada" }).error, "pedido_no_encontrado");
  assert.equal(dato({}, ).aplicados[0].monto, 100);
  assert.equal(planearAbono([p], { clienteId: "c1", monto: 100, metodo: "efectivo" }, AHORA, false).error, "cliente_no_encontrado");
  const contado = pedido(2, "2026-09-04T15:00:00Z", 1000, [], { pagoModo: "contado" });
  assert.equal(planearAbono([contado], { clienteId: "c1", monto: 100, metodo: "efectivo" }, AHORA).error, "sin_deuda");
});

test("un pedido cancelado no genera deuda", () => {
  const c = pedido(1, "2026-09-04T15:00:00Z", 2000, [500], { estado: "cancelado" });
  assert.equal(c.saldo, 0);
  assert.equal(c.pagado, 500);
  assert.equal(saldoDe({ estado: "cancelado", total: 100, pagoModo: "credito" }, []), 0);
  const r = cuentasPorCobrar([c], [{ id: "c1", nombre: "Ana", telefono: null }], AHORA);
  assert.equal(r.total, 0);
  assert.deepEqual(r.cuentas, []);
  assert.equal(planearAbono([c], { clienteId: "c1", monto: 100, metodo: "efectivo" }, AHORA).error, "sin_deuda");
  // De contado: pagado = total y saldo = 0
  const contado = conPago({ estado: "nuevo", total: 900, pagoModo: "contado" }, []);
  assert.equal(contado.pagado, 900);
  assert.equal(contado.saldo, 0);
});

test("un abono inicial igual al total deja el pedido de contado, sin abono", () => {
  const r = resolverPago(4300, { pagoModo: "credito", pagoFechaAcordada: "2026-10-15", abonoInicial: { monto: 4300, metodo: "efectivo" } });
  assert.deepEqual(r.resuelto, { pagoModo: "contado", pagoFechaAcordada: null, abono: null });
  const parcial = resolverPago(4300, { pagoModo: "credito", pagoFechaAcordada: "2026-10-15", abonoInicial: { monto: 1000, metodo: "transferencia" } });
  assert.deepEqual(parcial.resuelto, { pagoModo: "credito", pagoFechaAcordada: "2026-10-15", abono: { monto: 1000, metodo: "transferencia" } });
  // Sin nada o en 0: crédito sin abono; contado ignora todo lo demás
  assert.equal(resolverPago(100, { pagoModo: "credito", abonoInicial: { monto: 0, metodo: "otro" } }).resuelto.abono, null);
  assert.deepEqual(resolverPago(100, { pagoFechaAcordada: "2026-10-15", abonoInicial: { monto: 5, metodo: "otro" } }).resuelto, { pagoModo: "contado", pagoFechaAcordada: null, abono: null });
  // No válido: más que el total, negativo, decimales o fecha imposible
  assert.ok(resolverPago(100, { pagoModo: "credito", abonoInicial: { monto: 101, metodo: "otro" } }).error);
  assert.ok(resolverPago(100, { pagoModo: "credito", abonoInicial: { monto: -1, metodo: "otro" } }).error);
  assert.ok(resolverPago(100, { pagoModo: "credito", abonoInicial: { monto: 1.5, metodo: "otro" } }).error);
  assert.ok(resolverPago(100, { pagoModo: "credito", pagoFechaAcordada: "2026-02-31" }).error);
});

test("«Atrasado N días» se cuenta en hora de Santo Domingo, no en UTC", () => {
  // 29 sep 11:30 p. m. en Santo Domingo = 30 sep 03:30 UTC
  const tarde = Date.parse("2026-09-30T03:30:00.000Z");
  assert.equal(diasDeAtraso("2026-09-28", tarde), 1); // en UTC serían 2
  assert.equal(diasDeAtraso("2026-09-29", tarde), 0); // el mismo día no es atraso
  assert.equal(diasDeAtraso("2026-09-30", tarde), 0);
  // 30 sep 12:30 a. m. en Santo Domingo = 30 sep 04:30 UTC: ya es otro día
  const pasadaMedianoche = Date.parse("2026-09-30T04:30:00.000Z");
  assert.equal(diasDeAtraso("2026-09-29", pasadaMedianoche), 1);
  assert.equal(diasDeAtraso("2026-09-24", AHORA), 6);
  assert.equal(diasDeAtraso(null, AHORA), 0);
  assert.equal(diasParaPagar("2026-10-15", AHORA), 15);
  assert.equal(diasParaPagar("2026-09-30", AHORA), 0);
  assert.equal(diasParaPagar("2026-09-25", AHORA), -5);
  assert.equal(diasParaPagar(null, AHORA), null);
  assert.equal(textoAtraso(6), "Atrasado 6 días");
  assert.equal(textoAtraso(1, "a"), "Atrasada 1 día");
  assert.equal(textoFaltan(15), "Faltan 15 días");
  assert.equal(textoFaltan(1), "Falta 1 día");
  assert.equal(textoFaltan(0), "Vence hoy");
});

test("fechas: en 1 semana, fin de mes y sumar días", () => {
  assert.equal(sumarDias("2026-09-30", 7), "2026-10-07");
  assert.equal(sumarDias("2026-12-28", 7), "2027-01-04");
  assert.equal(finDeMes("2026-09-05"), "2026-09-30");
  assert.equal(finDeMes("2026-02-10"), "2026-02-28");
  assert.equal(finDeMes("2028-02-10"), "2028-02-29");
  assert.equal(finDeMes("2026-12-01"), "2026-12-31");
});

test("cuentas por cobrar: una fila por cliente, ordenadas (atrasados, con fecha, sin fecha) y con lo cobrado este mes", () => {
  const clientes = [
    { id: "ana", nombre: "Ana", telefono: "+18095550001" },
    { id: "bea", nombre: "Bea", telefono: null },
    { id: "cari", nombre: "Cari", telefono: "+18095550003" },
    { id: "dora", nombre: "Dora", telefono: "+18095550004" },
  ];
  const ps = [
    pedido(1, "2026-09-04T15:00:00Z", 1100, [400], { clienteId: "ana", pagoFechaAcordada: "2026-09-24" }), // atrasada 6
    pedido(2, "2026-09-15T15:00:00Z", 1200, [], { clienteId: "ana", pagoFechaAcordada: "2026-10-03" }),
    pedido(3, "2026-09-21T15:00:00Z", 1100, [300], { clienteId: "bea", pagoFechaAcordada: "2026-10-09" }), // con fecha
    pedido(4, "2026-09-18T15:00:00Z", 1100, [500], { clienteId: "cari" }), // sin fecha
    pedido(5, "2026-09-10T15:00:00Z", 900, [], { clienteId: "dora", pagoFechaAcordada: "2026-09-20" }), // atrasada 10
    pedido(6, "2026-09-10T15:00:00Z", 900, [900], { clienteId: "bea" }), // saldado: no cuenta
    pedido(7, "2026-08-10T15:00:00Z", 900, [100], { clienteId: "cari", pagoFechaAcordada: "2026-08-30" }), // abono de agosto
  ];
  // Abonos con fecha: los de septiembre cuentan en "este mes"; el de agosto, no.
  ps[6].abonos[0].fecha = "2026-08-12T15:00:00Z";
  const r = cuentasPorCobrar(ps, clientes, AHORA);
  assert.deepEqual(
    r.cuentas.map((c) => [c.clienteId, c.deuda, c.pedidos, c.atrasoDias]),
    [
      ["cari", 1400, 2, 31], // el pedido de agosto quedó de pagar el 30 ago
      ["dora", 900, 1, 10],
      ["ana", 1900, 2, 6],
      ["bea", 800, 1, 0],
    ],
  );
  assert.equal(r.total, 5000);
  assert.equal(r.clientes, 4);
  assert.equal(r.pedidos, 6);
  assert.equal(r.cobradoEsteMes, 2100); // 400 + 300 + 500 + 900 (el de agosto no cuenta)
  const cari = r.cuentas[0];
  assert.equal(cari.pedidoMasViejo.numero, 7);
  assert.equal(cari.unico, null);
  assert.deepEqual(r.cuentas[1].unico, { id: "p5", numero: 5, pagado: 0, total: 900 });
  // Sin fecha va después de los que tienen fecha, y entre ellos la deuda más vieja primero
  const sin = cuentasPorCobrar(
    [pedido(1, "2026-09-20T15:00:00Z", 100, [], { clienteId: "ana" }), pedido(2, "2026-09-10T15:00:00Z", 100, [], { clienteId: "bea" }), pedido(3, "2026-09-25T15:00:00Z", 100, [], { clienteId: "cari", pagoFechaAcordada: "2026-11-01" })],
    clientes,
    AHORA,
  );
  assert.deepEqual(sin.cuentas.map((c) => c.clienteId), ["cari", "bea", "ana"]);
});

test("cuenta del cliente: deuda, pedidos con saldo e historial mezclado del más reciente al más viejo", () => {
  const ps = [
    pedido(3, "2026-09-04T15:00:00Z", 2000, [], { pagoFechaAcordada: "2026-09-24" }),
    pedido(7, "2026-09-20T15:00:00Z", 1100),
    pedido(9, "2026-09-22T15:00:00Z", 700, [], { estado: "cancelado" }),
    pedido(8, "2026-09-25T15:00:00Z", 500, [], { pagoModo: "contado" }),
  ];
  ps[0].abonos.push({ id: "ab", tiendaId: "t", pedidoId: "p3", monto: 800, metodo: "efectivo", fecha: "2026-09-12T15:00:00Z", nota: "en mano", creadoEn: "2026-09-12T15:00:00Z" });
  ps[0].pagado = 800;
  ps[0].saldo = 1200;
  const c = cuentaDeCliente(ps, "c1", AHORA);
  assert.equal(c.deuda, 2300);
  assert.deepEqual(c.pedidos.map((p) => [p.numero, p.saldo]), [[3, 1200], [7, 1100]]);
  assert.deepEqual(c.historial.map((m) => [m.tipo, m.numero, m.monto]), [["compra", 7, 1100], ["abono", 3, 800], ["compra", 3, 2000]]);
  assert.equal(c.atrasoDias, 6);
  assert.equal(c.atrasado, true);
  assert.equal(cuentaDeCliente(ps, "otro", AHORA).deuda, 0);
});

test("resumen de un pedido saldado: cuántos abonos y en cuántos días", () => {
  const p = { creadoEn: "2026-09-22T15:00:00Z", total: 4300, abonos: [{ fecha: "2026-09-22T16:00:00Z" }, { fecha: "2026-10-15T15:00:00Z" }, { fecha: "2026-09-29T15:00:00Z" }] };
  assert.deepEqual(resumenDeSaldado(p), { abonos: 3, dias: 23 });
});

test("el monto se escribe entero: sin decimales, sin negativos, sin letras", () => {
  assert.equal(montoDeTexto("1,500"), 1500);
  assert.equal(montoDeTexto("RD$ 1500"), 1500);
  assert.equal(montoDeTexto("1500.00"), 1500);
  assert.equal(montoDeTexto("-300"), 300);
  assert.equal(montoDeTexto(""), 0);
  assert.equal(montoDeTexto("abc"), 0);
});

test("recordatorio de WhatsApp: texto y enlace (1 delante si el número tiene 10 dígitos)", () => {
  const texto = mensajeRecordatorio({ cliente: "Marleny Peña", vendedora: "Michel", tienda: "Esencias Michel", deuda: 2300 });
  assert.equal(texto, "¡Hola, Marleny! Te escribe Michel, de Esencias Michel. Te recuerdo con cariño que quedó pendiente RD$2,300. Cuando puedas me avisas. ¡Gracias!");
  assert.ok(!mensajeRecordatorio({ cliente: "Ana", vendedora: "", tienda: "Luna", deuda: 100 }).includes("Luna, de Luna"));
  assert.equal(enlaceWhatsAppCliente("+18095550142", "hola ñ"), "https://wa.me/18095550142?text=hola%20%C3%B1");
  assert.equal(enlaceWhatsAppCliente("809-555-0142", "x"), "https://wa.me/18095550142?text=x");
});

test("errores de la base: mensajes amables en español", () => {
  const e = (mensaje) => traducirErrorSupabase({ message: mensaje });
  assert.equal(e("monto_mayor_que_deuda: 2800").message, "Te debe RD$2,800; no puedes abonar más que eso.");
  assert.ok(e("monto_invalido").message.includes("monto"));
  assert.ok(e("metodo_invalido").message.includes("efectivo"));
  assert.ok(e("nota_invalida").message.includes("200"));
  // La nota del cliente (60, restricción clientes_nota_largo) no se confunde con la del abono
  const nota = e('new row for relation "clientes" violates check constraint "clientes_nota_largo"');
  assert.ok(nota instanceof NotaClienteLarga);
  assert.ok(nota.message.includes("60"));
  assert.ok(e("sin_deuda").message.includes("nada pendiente"));
  assert.ok(e("abono_no_encontrado").message.includes("abono"));
  assert.ok(e("pedido_no_encontrado").message.includes("pedido"));
  assert.ok(e("cliente_no_encontrado").message.includes("cliente"));
  assert.ok(e("fecha_invalida").message.includes("fecha"));
  assert.ok(e("tienda_no_encontrada").message.includes("tienda"));
  assert.ok(e("pedido_con_abonos") instanceof PedidoConAbonos);
  assert.ok(e("pedido_con_abonos").message.includes("abonos"));
});

test("editar un abono: cambia el monto y el método, y el pedido recalcula su saldo", () => {
  // Pedido de 2,000 con dos abonos (800 y 500): debe 700
  const p = pedido(1, "2026-09-04T15:00:00Z", 2000, [800, 500]);
  const [a1, a2] = p.abonos;
  const r = planearEdicionAbono(p, a1, { monto: 1000, metodo: "transferencia", fecha: "2026-09-05T15:00:00.000Z", nota: "  le di cambio " }, AHORA);
  assert.deepEqual(r, { monto: 1000, metodo: "transferencia", fecha: "2026-09-05T15:00:00.000Z", nota: "le di cambio" });
  // Con el abono editado (mismo pedido, el otro intacto) la deuda baja a 500
  const editados = [{ ...a1, ...r }, a2];
  const despues = conPago(p, editados);
  assert.equal(despues.pagado, 1500);
  assert.equal(despues.saldo, 500);
});

test("editar un abono: no puede pasar de lo que el pedido debía antes de ese abono", () => {
  const p = pedido(1, "2026-09-04T15:00:00Z", 2000, [800, 500]); // saldo 700; el abono de 800 puede valer hasta 1,500
  const cambios = (monto) => ({ monto, metodo: "efectivo", fecha: "2026-09-05T15:00:00.000Z" });
  assert.equal(planearEdicionAbono(p, { monto: 800 }, cambios(1500), AHORA).monto, 1500);
  const r = planearEdicionAbono(p, { monto: 800 }, cambios(1501), AHORA);
  assert.deepEqual(r, { error: "monto_mayor_que_deuda", deuda: 1500 });
  assert.equal(traducirErrorSupabase({ message: "monto_mayor_que_deuda: 1500" }).deuda, 1500);
});

test("editar un abono: valida método, nota, fecha y monto como la base", () => {
  const p = pedido(1, "2026-09-04T15:00:00Z", 2000, [800]);
  const ok = { monto: 100, metodo: "otro", fecha: "2026-09-05T15:00:00.000Z" };
  assert.equal(planearEdicionAbono(p, { monto: 800 }, { ...ok, nota: "" }, AHORA).nota, null);
  assert.deepEqual(planearEdicionAbono(p, { monto: 800 }, { ...ok, monto: 0 }, AHORA), { error: "monto_invalido" });
  assert.deepEqual(planearEdicionAbono(p, { monto: 800 }, { ...ok, metodo: "cheque" }, AHORA), { error: "metodo_invalido" });
  assert.deepEqual(planearEdicionAbono(p, { monto: 800 }, { ...ok, nota: "x".repeat(201) }, AHORA), { error: "nota_invalida" });
  assert.deepEqual(planearEdicionAbono(p, { monto: 800 }, { ...ok, fecha: "2026-12-01T00:00:00.000Z" }, AHORA), { error: "fecha_invalida" });
});

test("texto de fecha del bloque de deuda", () => {
  // AHORA = miércoles 30 sep 2026 (mediodía en Santo Domingo)
  assert.equal(textoFechaDeuda("2026-09-30", AHORA), "Hoy");
  assert.equal(textoFechaDeuda("2026-10-01", AHORA), "Mañana");
  assert.equal(textoFechaDeuda("2026-10-10", AHORA), "Sáb 10 oct");
  assert.equal(textoFechaDeuda("2026-10-09", AHORA), "Vie 9 oct");
  assert.equal(textoFechaDeuda("2027-01-05", AHORA), "Mar 5 ene 2027");
  assert.equal(textoFechaDeuda("2026-09-29", AHORA), "Atrasado 1 día");
  assert.equal(textoFechaDeuda("2026-09-24", AHORA), "Atrasado 6 días");
  assert.equal(textoFechaDeuda(null, AHORA), "Sin fecha");
  assert.equal(textoFechaDeudaAccesible("2026-10-09", AHORA), "paga el viernes 9 de octubre");
  assert.equal(textoFechaDeudaAccesible("2026-09-24", AHORA), "atrasado 6 días");
  assert.equal(textoFechaDeudaAccesible(null, AHORA), "sin fecha de pago");
  assert.equal(diaLargo("2027-01-05", AHORA), "martes 5 de enero de 2027");
});

test("bloque de deuda de un cliente: suma el total y lo abonado de TODOS sus pedidos con saldo", () => {
  const a = pedido(1, "2026-09-04T15:00:00Z", 2000, [800]); // saldo 1,200
  const b = pedido(2, "2026-09-12T15:00:00Z", 500); // saldo 500, sin abonos
  assert.deepEqual(totalYAbonado([a, b]), { totalPedidos: 2500, abonado: 800 });
  assert.deepEqual(totalYAbonado([]), { totalPedidos: 0, abonado: 0 });
  const [cuenta] = cuentasPorCobrar([a, b], [{ id: "c1", nombre: "Ana", telefono: null }], AHORA).cuentas;
  assert.equal(cuenta.deuda, 1700);
  assert.equal(cuenta.totalPedidos, 2500);
  assert.equal(cuenta.abonado, 800);
  const c = cuentaDeCliente([a, b], "c1", AHORA);
  assert.equal(c.totalPedidos, 2500);
  assert.equal(c.abonado, 800);
});

test("mensajes de recordatorio: cuatro tonos con los datos reales y el elegido por defecto", () => {
  const base = { cliente: "Luisanna Pérez", vendedora: "Michel", tienda: "Esencias Michel", deuda: 2425, ahora: AHORA };
  // Con fecha futura (vie 9 oct): Con cariño, Con la fecha y Corto; por defecto Con cariño
  const futura = mensajesRecordatorio({ ...base, fecha: "2026-10-09" });
  assert.deepEqual(futura.mensajes.map((m) => m.id), ["carino", "fecha", "corto"]);
  assert.equal(futura.elegido, "carino");
  assert.equal(futura.mensajes[1].texto, "¡Hola, Luisanna! Te escribe Michel, de Esencias Michel. Te recuerdo que quedamos en el pago de RD$2,425 para el viernes 9 de octubre. ¡Gracias!");
  assert.equal(futura.mensajes[2].texto, "Hola, Luisanna. Te recuerdo el pendiente de RD$2,425 con Esencias Michel. ¡Gracias!");
  // Vencida: aparece "Si ya pasó la fecha" y va por defecto
  const vencida = mensajesRecordatorio({ ...base, fecha: "2026-09-24" });
  assert.deepEqual(vencida.mensajes.map((m) => m.id), ["carino", "fecha", "corto", "vencido"]);
  assert.equal(vencida.elegido, "vencido");
  assert.equal(vencida.mensajes[3].texto, "¡Hola, Luisanna! Te escribe Michel, de Esencias Michel. El pago de RD$2,425 quedó para el jueves 24 de septiembre y todavía aparece pendiente. ¿Me confirmas cuándo puedes? ¡Gracias!");
  // Sin fecha: sin "Con la fecha" ni "Si ya pasó"; sin vendedora, sin "Te escribe…"
  const sinFecha = mensajesRecordatorio({ ...base, vendedora: "", fecha: null });
  assert.deepEqual(sinFecha.mensajes.map((m) => m.id), ["carino", "corto"]);
  const sinVendedora = mensajesRecordatorio({ ...base, vendedora: " ", fecha: "2026-09-24" });
  assert.ok(!sinVendedora.mensajes[3].texto.includes("Te escribe"));
  assert.equal(sinVendedora.mensajes[3].texto, "¡Hola, Luisanna! El pago de RD$2,425 quedó para el jueves 24 de septiembre y todavía aparece pendiente. ¿Me confirmas cuándo puedes? ¡Gracias!");
});
