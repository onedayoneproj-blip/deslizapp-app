// Datos de ejemplo para las vistas previas de «Todos los planes traen» (components/planes/vistas-previas.tsx): pedidos, existencias y
// clientes inventados, que las piezas reales del panel pintan sin base de datos ni sesión. Sin acciones ni nada guardado.
// Puro: tests/planes.test.mjs.

import { diaDeSantoDomingo, sumarDias, type CuentaPorCobrar } from "../credito";
import type { ClienteConResumen, PedidoConItems } from "../types";

/** El instante en que se arma la página (ms). Las fechas de los datos de ejemplo salen de aquí: «hace 2 horas», «vence en 3 días». */
export const instanteDeLaPagina = (): number => Date.now();

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

/** «AAAA-MM-DD» de dentro de `dias` días en Santo Domingo, como todas las fechas de deuda (la fecha acordada de la deuda de ejemplo). */
const diaDentroDe = (ahora: number, dias: number) => sumarDias(diaDeSantoDomingo(ahora), dias);

/** Tres clientas de ejemplo para la lista de Clientes: dos con un pedido en crédito (una al día con su fecha y otra atrasada, con abono) y una sin deuda. */
export function ejemploClientes(ahora: number): { cliente: ClienteConResumen; cuenta: CuentaPorCobrar }[] {
  const base = { tiendaId: "ejemplo", origen: "catalogo" as const, nota: null, telefono: null, primerPedidoEn: new Date(ahora - 40 * DIA).toISOString() };
  const clienta = (id: string, nombre: string, emoji: string, avatarColor: "rosa" | "dorado" | "menta", pedidos: number, totalGastado: number, repite: boolean): ClienteConResumen => ({
    ...base,
    id,
    nombre,
    avatarEmoji: emoji,
    avatarColor,
    pedidos,
    totalGastado,
    ultimaCompra: new Date(ahora - 2 * DIA).toISOString(),
    repite,
  });
  const cuentaDe = (c: ClienteConResumen, deuda: number, totalPedidos: number, dias: number) =>
    ({
      clienteId: c.id,
      nombre: c.nombre,
      telefono: null,
      deuda,
      totalPedidos,
      abonado: totalPedidos - deuda,
      pedidos: deuda > 0 ? 1 : 0,
      pedidoMasViejo: { id: "ejemplo-pedido", numero: 27, creadoEn: new Date(ahora - 2 * DIA).toISOString(), dias: 2 },
      fechaAcordada: deuda > 0 ? diaDentroDe(ahora, dias) : null,
    }) as unknown as CuentaPorCobrar;
  const maria = clienta("ejemplo-maria", "María P.", "🌸", "rosa", 3, 5400, true);
  const luisa = clienta("ejemplo-luisa", "Luisa T.", "🍋", "dorado", 2, 2600, true);
  const ana = clienta("ejemplo-ana", "Ana R.", "🌿", "menta", 1, 1500, false);
  return [
    { cliente: maria, cuenta: cuentaDe(maria, 1800, 3000, 3) },
    { cliente: luisa, cuenta: cuentaDe(luisa, 650, 1000, -2) },
    { cliente: ana, cuenta: cuentaDe(ana, 0, 0, 0) },
  ];
}

/** Un pedido nuevo del catálogo, al contado, con dos productos. */
export function ejemploPedido(ahora: number): { pedido: PedidoConItems; cliente: { nombre: string; repite: boolean; avatarEmoji: string; avatarColor: "rosa" }; fotos: Map<string, { fotos: string[] }> } {
  const items = [
    { id: "i1", pedidoId: "ejemplo-pedido", productoId: "termo", nombreProducto: "Termo rosado", cantidad: 1, precioUnitario: 950, varianteId: null, varianteTexto: null, porEncargo: false },
    { id: "i2", pedidoId: "ejemplo-pedido", productoId: "tote", nombreProducto: "Tote bag crema y verde", cantidad: 1, precioUnitario: 550, varianteId: null, varianteTexto: null, porEncargo: false },
  ];
  const pedido: PedidoConItems = {
    id: "ejemplo-pedido",
    tiendaId: "ejemplo",
    numero: 27,
    clienteId: "ejemplo-maria",
    origen: "catalogo",
    estado: "nuevo",
    total: 1500,
    codigoPromo: null,
    creadoEn: new Date(ahora - 2 * HORA).toISOString(),
    despachadoEn: null,
    pagoModo: "contado",
    pagoFechaAcordada: null,
    items,
    pagado: 1500,
    saldo: 0,
    abonos: [],
  };
  return {
    pedido,
    cliente: { nombre: "María P.", repite: true, avatarEmoji: "🌸", avatarColor: "rosa" },
    fotos: new Map([
      ["termo", { fotos: ["/landing/feed-termo.webp"] }],
      ["tote", { fotos: ["/landing/feed-tote.webp"] }],
    ]),
  };
}

/** Productos de ejemplo de las existencias: uno con pocas, uno con variantes y una agotada. */
export const EJEMPLO_EXISTENCIAS = [
  { id: "termo", nombre: "Termo rosado", fotos: ["/landing/feed-termo.webp"], activo: true, stock: 2 },
  { id: "tote", nombre: "Tote bag crema y verde", fotos: ["/landing/feed-tote.webp"], activo: true, stock: 14 },
];
