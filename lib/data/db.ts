// El "almacén" de la demo: la forma de los datos en memoria y cómo se arma desde el seed.
// Nada fuera de lib/data/ importa este archivo.

import { MARCA_NEUTRA } from "../marca";
import { diaDeSantoDomingo, sumarDias } from "../credito";
import type { TrabajoRetoque } from "../admin/tipos";
import type { Abono, AjusteInventario, AvisoLlegada, Cliente, EnvioJugada, EventoAaah, Pedido, PedidoItem, Producto, Promo, SolicitudPedido, Tienda, Usuario, Variante } from "../types";
import {
  aCliente,
  aEventoAaah,
  aPedido,
  aPedidoItem,
  aProducto,
  aPromo,
  aTienda,
  aUsuario,
  aVariante,
  slugDesdeTexto,
  type AjusteFecha,
  type FilaVariante,
  type FilaCliente,
  type FilaEventoAaah,
  type FilaPedido,
  type FilaPedidoItem,
  type FilaProducto,
  type FilaPromo,
  type FilaTienda,
  type FilaUsuario,
} from "./filas";

import seedClientes from "./seed/clientes.json";
import seedEventos from "./seed/eventos_aaah.json";
import seedMeta from "./seed/meta.json";
import seedPedidoItems from "./seed/pedido_items.json";
import seedPedidos from "./seed/pedidos.json";
import seedProductos from "./seed/productos.json";
import seedPromos from "./seed/promos.json";
import { marcasDeLaDemo, type MarcaGuardada } from "./marca-retoque";
import type { NivelDemo } from "./equipo-demo";
import type { EquipoTienda } from "../equipo";
import seedTiendas from "./seed/tiendas.json";
import seedUsuarios from "./seed/usuarios.json";
import seedVariantes from "./seed/producto_variantes.json";

export type DB = {
  tiendas: Tienda[];
  usuarios: Usuario[];
  productos: Producto[];
  pedidos: Pedido[];
  pedidoItems: PedidoItem[];
  /** Pagos parciales de los pedidos a crédito (solo se crean y se borran con las operaciones de abonos). */
  abonos: Abono[];
  /** Ajustes manuales de inventario; separados de pedidos y ventas. */
  ajustesInventario: AjusteInventario[];
  clientes: Cliente[];
  promos: Promo[];
  eventosAaah: EventoAaah[];
  /** Lo enviado desde Tu próxima jugada. */
  jugadaEnvios: EnvioJugada[];
  /** Variantes de los productos (el `stock` del producto es la suma de las activas). */
  variantes: Variante[];
  /** Pedidos del catálogo que la tienda todavía no registra. */
  solicitudes: (SolicitudPedido & { dispositivo?: string })[];
  /** "Avísame cuando llegue". */
  avisos: (AvisoLlegada & { dispositivo?: string })[];
  /** Fotos que la tienda mandó al taller (retoque real). Las comparte el admin demo en el mismo navegador. */
  trabajosRetoque: TrabajoRetoque[];
  /** «Mi marca» para el retoque, por tienda (palabras, lo que evita, fotos de referencia). El Instagram va en la tienda. */
  marcasRetoque: Record<string, MarcaGuardada>;
  /** «Tu equipo» por tienda: miembros, solicitudes, enlaces activos e invitaciones por correo (de ejemplo). */
  equipos: Record<string, EquipoTienda>;
  /** Cómo se mira la app en la demo: como dueña (lo normal) o como colaborador de un nivel. */
  nivelDemo: NivelDemo;
};

/**
 * Arma la base de la demo desde lib/data/seed/*.json.
 * Las fechas del seed están escritas respecto a `meta.fecha_referencia`; aquí se desplazan
 * para que esa referencia sea "ahora" (si no, en un mes la semana del Resumen estaría vacía).
 */
export function construirDesdeSeed(ahora: number = Date.now()): DB {
  const desfase = ahora - Date.parse(seedMeta.fecha_referencia);
  const fecha: AjusteFecha = (iso) => new Date(Date.parse(iso) + desfase).toISOString();

  const credito = ventasACreditoDeLaDemo((seedPedidos as FilaPedido[]).map((f) => aPedido(f, fecha)), ahora);

  return {
    tiendas: (seedTiendas as FilaTienda[]).map((f) => aTienda(f, fecha)),
    usuarios: (seedUsuarios as FilaUsuario[]).map(aUsuario),
    productos: (seedProductos as unknown as FilaProducto[]).map((f) => aProducto(f, fecha)),
    pedidos: credito.pedidos,
    pedidoItems: (seedPedidoItems as FilaPedidoItem[]).map(aPedidoItem),
    abonos: credito.abonos,
    ajustesInventario: [],
    jugadaEnvios: [],
    clientes: (seedClientes as FilaCliente[]).map((f) => aCliente(f, fecha)),
    promos: (seedPromos as FilaPromo[]).map((f) => aPromo(f, fecha)),
    eventosAaah: (seedEventos as FilaEventoAaah[]).map((f) => aEventoAaah(f, fecha)),
    variantes: (seedVariantes as unknown as FilaVariante[]).map(aVariante),
    solicitudes: [],
    avisos: avisosDeLaDemo(ahora),
    trabajosRetoque: [],
    marcasRetoque: marcasDeLaDemo(),
    equipos: {},
    nivelDemo: "dueno",
  };
}

/**
 * Personas que pidieron "Avísame cuando llegue" (en la demo no hay catálogo público todavía): dos esperan Urban Toy (agotado) en
 * Esencias Michel y una la camisa de lino M · Arena (agotada) en Lino & Algodón.
 */
function avisosDeLaDemo(ahora: number): DB["avisos"] {
  const hace = (dias: number) => new Date(ahora - dias * 86_400_000).toISOString();
  const michel = "a1000000-0000-4000-8000-000000000001";
  const lino = "a1000000-0000-4000-8000-000000000003";
  return [
    { id: "a8000000-0000-4000-8000-000000000001", tiendaId: michel, productoId: "a3000000-0000-4000-8000-000000000008", varianteId: null, telefono: "18095550142", nombre: "Carolina Peña", creadoEn: hace(3), avisadoEn: null },
    { id: "a8000000-0000-4000-8000-000000000002", tiendaId: michel, productoId: "a3000000-0000-4000-8000-000000000008", varianteId: null, telefono: "18295550311", nombre: null, creadoEn: hace(1), avisadoEn: null },
    { id: "a8000000-0000-4000-8000-000000000003", tiendaId: lino, productoId: "a3000000-0000-4000-8000-000000000017", varianteId: "a7000000-0000-4000-8000-000000000002", telefono: "18495550177", nombre: "Mariela Cruz", creadoEn: hace(2), avisadoEn: null },
  ];
}

/**
 * Tres clientes de Esencias Michel que compraron fiado, para que las pantallas de crédito se vean llenas: uno atrasado (con dos
 * pedidos y un abono), uno con fecha para pagar en el futuro y uno sin fecha. Se marcan sobre pedidos que ya estaban despachados
 * en el seed (números de pedido de esa tienda), con las fechas relativas a "ahora".
 */
function ventasACreditoDeLaDemo(pedidos: Pedido[], ahora: number): { pedidos: Pedido[]; abonos: Abono[] } {
  const hoy = diaDeSantoDomingo(ahora);
  const tienda = "a1000000-0000-4000-8000-000000000001";
  const dia = 24 * 60 * 60 * 1000;
  // numero → cómo se pagó: fecha acordada (o null) y abonos (días después del pedido, monto, método, nota)
  const plan: Record<number, { fecha: string | null; abonos: { dias: number; monto: number; metodo: Abono["metodo"]; nota?: string }[] }> = {
    1030: { fecha: sumarDias(hoy, -6), abonos: [{ dias: 2, monto: 400, metodo: "efectivo", nota: "Al entregar" }] },
    1033: { fecha: sumarDias(hoy, 3), abonos: [] },
    1036: { fecha: sumarDias(hoy, 9), abonos: [{ dias: 2, monto: 300, metodo: "transferencia" }] },
    1034: { fecha: null, abonos: [{ dias: 2, monto: 500, metodo: "efectivo" }] },
  };
  const abonos: Abono[] = [];
  const marcados = pedidos.map((p) => {
    const cuenta = p.tiendaId === tienda ? plan[p.numero] : undefined;
    if (!cuenta) return p;
    cuenta.abonos.forEach((a, i) => {
      const fecha = new Date(Math.min(Date.parse(p.creadoEn) + a.dias * dia, ahora)).toISOString();
      abonos.push({
        id: `a9000000-0000-4000-8000-${String(p.numero).padStart(9, "0")}${String(i).padStart(3, "0")}`,
        tiendaId: p.tiendaId,
        pedidoId: p.id,
        monto: a.monto,
        metodo: a.metodo,
        fecha,
        nota: a.nota ?? null,
        creadoEn: fecha,
      });
    });
    return { ...p, pagoModo: "credito" as const, pagoFechaAcordada: cuenta.fecha };
  });
  return { pedidos: marcados, abonos };
}

/** Comprobación mínima de que lo guardado en localStorage tiene la forma esperada. */
export function esDB(valor: unknown): valor is DB {
  if (!valor || typeof valor !== "object") return false;
  const db = valor as Record<string, unknown>;
  return ["tiendas", "usuarios", "productos", "pedidos", "pedidoItems", "clientes", "promos", "eventosAaah"].every((k) =>
    Array.isArray(db[k]),
  );
}

/**
 * Migración suave de lo guardado en localStorage: datos de versiones anteriores sin campos nuevos
 * (ej. `nota` de clientes) siguen funcionando, con esos campos en su valor vacío. No hace falta reiniciar.
 */
export function migrar(db: DB): DB {
  return {
    ...db,
    // Pedidos guardados antes de las ventas a crédito: todos de contado y sin abonos
    pedidos: db.pedidos.map((p) => ({ ...p, pagoModo: p.pagoModo ?? "contado", pagoFechaAcordada: p.pagoFechaAcordada ?? null })),
    abonos: db.abonos ?? [],
    ajustesInventario: db.ajustesInventario ?? [],
    clientes: db.clientes.map((c) => ({ ...c, nota: c.nota ?? null })),
    // Promos guardadas antes del límite de usos y la pausa
    promos: db.promos.map((p) => ({ ...p, limiteUsos: p.limiteUsos ?? null, pausada: p.pausada ?? false, clienteId: p.clienteId ?? null })),
    jugadaEnvios: db.jugadaEnvios ?? [],
    // Catálogo conectado: productos guardados antes de slug, medios, detalles y variantes
    productos: conCamposDelCatalogo(db.productos),
    pedidoItems: db.pedidoItems.map((i) => ({ ...i, varianteId: i.varianteId ?? null, varianteTexto: i.varianteTexto ?? null, porEncargo: i.porEncargo ?? false })),
    variantes: db.variantes ?? [],
    solicitudes: db.solicitudes ?? [],
    avisos: db.avisos ?? [],
    trabajosRetoque: db.trabajosRetoque ?? [],
    marcasRetoque: db.marcasRetoque ?? {},
    nivelDemo: db.nivelDemo ?? "dueno",
    equipos: db.equipos ?? {},
    // Mi marca: tiendas guardadas antes de que existiera, con la paleta neutra (nunca el verde de Deslizapp)
    tiendas: db.tiendas.map((t) => ({
      ...t,
      marcaColorPrincipal: t.marcaColorPrincipal ?? MARCA_NEUTRA.principal,
      marcaColorAcento: t.marcaColorAcento ?? MARCA_NEUTRA.acento,
      marcaEstilo: t.marcaEstilo ?? MARCA_NEUTRA.estilo,
      urlCatalogo: t.urlCatalogo ?? null,
      estado: t.estado ?? "activa",
      catalogoEstado: t.catalogoEstado ?? "sin",
      catalogoPaso: t.catalogoPaso ?? null,
      catalogoNotasCambios: t.catalogoNotasCambios ?? null,
      catalogoSolicitadoEn: t.catalogoSolicitadoEn ?? null,
      catalogoPublicadoEn: t.catalogoPublicadoEn ?? null,
      rubro: t.rubro ?? "general",
    })),
  };
}

/** Rellena slug (único por tienda), tipo, medios (desde fotos), detalles, opciones y encargo donde falten. */
function conCamposDelCatalogo(productos: Producto[]): Producto[] {
  const usados = new Set(productos.filter((p) => p.slug).map((p) => `${p.tiendaId}:${p.slug}`));
  return productos.map((p) => {
    let slug = p.slug;
    if (!slug) {
      const base = slugDesdeTexto(p.nombre);
      slug = base;
      for (let n = 2; usados.has(`${p.tiendaId}:${slug}`); n++) slug = `${base}-${n}`;
      usados.add(`${p.tiendaId}:${slug}`);
    }
    return {
      ...p,
      slug,
      tipo: p.tipo ?? "producto",
      medios: p.medios ?? p.fotos.map((url, i) => ({ tipo: "foto" as const, url, retocada: i === 0 && p.fotoRetocada })),
      detalles: p.detalles ?? {},
      opciones: p.opciones ?? [],
      fotosPorValor: p.fotosPorValor ?? {},
      porEncargo: p.porEncargo ?? false,
      encargoTexto: p.encargoTexto ?? null,
    };
  });
}

/** UUID v4. `crypto.randomUUID` solo existe en contextos seguros (https / localhost). */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
