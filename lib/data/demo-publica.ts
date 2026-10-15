import { CLAVES_ONBOARDING } from "../onboarding";
import snapshot from "./seed/deslizapp-publico.json";
import { construirDesdeSeed, type DB } from "./db";
import type { Producto, Tienda, Variante } from "../types";

export const ID_DEMO_PUBLICA = "demo-publica-deslizapp";
export const SLUG_DEMO_PUBLICA = "deslizapp-ejemplo";

/** Solo presentación pública versionada. Identidad, precios, inventario y actividad son ficticios. */
export function construirDemoPublica(ahora = Date.now()): DB {
  const base = construirDesdeSeed(ahora);
  const fecha = (dias = 0) => new Date(ahora - dias * 86_400_000).toISOString();
  const tienda: Tienda = {
    ...base.tiendas[0], ...snapshot.perfil,
    id: ID_DEMO_PUBLICA, slug: SLUG_DEMO_PUBLICA, nombre: "Deslizapp · ejemplo",
    whatsapp: "18095550100", instagram: null, nombreVendedora: "Tu tienda de ejemplo",
    personalizacion: snapshot.perfil.personalizacion,
    estado: "activa", catalogoEstado: "publicado", catalogoPaso: null,
    catalogoSolicitadoEn: null, catalogoPublicadoEn: fecha(5), catalogoNotasCambios: null,
    creadoEn: fecha(30), onboarding: Object.fromEntries(CLAVES_ONBOARDING.map(k => [k, fecha(5)])), rubros: ["ropa", "accesorios", "hogar", "general"],
    // Se resuelve al origen actual en la fuente; siempre lleva la marca demo.
    urlCatalogo: `https://deslizapp.com/tienda/${SLUG_DEMO_PUBLICA}?demo`,
  } as Tienda;
  const variantes: Variante[] = [];
  const productos: Producto[] = snapshot.productos.map((p, i) => {
    const id = `demo-publica-producto-${i + 1}`;
    const opciones = p.opciones.length ? p.opciones : p.rubro === "ropa" ? [{ nombre: "Talla", valores: ["S", "M", "L"] }] : [];
    // Opciones de ejemplo: no describen variantes comercializables del negocio.
    if (opciones.length) {
      const combinaciones = opciones.reduce<Record<string, string>[]>((a, o) => a.flatMap(v => o.valores.map(valor => ({ ...v, [o.nombre]: valor }))), [{}]);
      combinaciones.forEach((valores, n) => variantes.push({ id: `${id}-variante-${n}`, productoId: id, valores, stock: 6, precio: null, activa: true, orden: n }));
    }
    return { ...p, id, tiendaId: tienda.id, precio: 250 + i * 150, stock: opciones.length ? variantes.filter(v => v.productoId === id).length * 6 : 12 + i,
      fotos: p.medios.filter(m => m.tipo === "foto").map(m => m.url), fotoRetocada: true,
      activo: true, destacado: i < 3, likes: 5 + i * 3, creadoEn: fecha(10), actualizadoEn: fecha(1),
      tipo: "producto", opciones, porEncargo: false, encargoTexto: null, orden: i, opiniones: [],
    } as Producto;
  });
  const clientes = ["Ana de Ejemplo", "Bruno de Ejemplo", "Carla de Ejemplo", "Diana de Ejemplo"].map((nombre, i) => ({ id: `demo-publica-cliente-${i}`, tiendaId: tienda.id, nombre, telefono: `1809555010${i + 1}`, origen: "manual" as const, primerPedidoEn: fecha(7 - i), nota: "Cliente ficticio de la demo." }));
  const pedidos = Array.from({ length: 12 }, (_, i) => {
    const producto = productos[i % productos.length];
    return { id: `demo-publica-pedido-${i}`, tiendaId: tienda.id, numero: 1001 + i, clienteId: clientes[i % clientes.length].id, origen: i % 2 ? "manual" as const : "catalogo" as const,
      estado: i < 8 ? "despachado" as const : i < 10 ? "por_despachar" as const : "nuevo" as const,
      total: producto.precio, codigoPromo: null, creadoEn: fecha(6 - i / 2), despachadoEn: i < 8 ? fecha(5 - i / 2) : null,
      pagoModo: i === 2 || i === 6 ? "credito" as const : "contado" as const, pagoFechaAcordada: null };
  });
  return {
    ...base, tiendas: [tienda], usuarios: [{ id: "demo-publica-dueno", tiendaId: tienda.id, email: "ejemplo@example.invalid", nombre: "Tu tienda de ejemplo", rol: "dueno" }], productos, variantes, clientes, pedidos,
    pedidoItems: pedidos.map((pedido, i) => { const p = productos[i % productos.length]; const v = variantes.find(v => v.productoId === p.id); return { id: `demo-publica-item-${i}`, pedidoId: pedido.id, productoId: p.id, nombreProducto: p.nombre, cantidad: 1, precioUnitario: p.precio, varianteId: v?.id ?? null, varianteTexto: v ? Object.values(v.valores).join(" · ") : null, porEncargo: false }; }),
    abonos: pedidos.filter(p => p.pagoModo === "credito").map((p, i) => ({ id: `demo-publica-abono-${i}`, tiendaId: tienda.id, pedidoId: p.id, monto: 100, metodo: "efectivo", fecha: fecha(1), creadoEn: fecha(1), nota: "Abono de ejemplo" })),
    eventosAaah: productos.flatMap((p, i) => [{ id: `demo-publica-aaah-${i}`, tiendaId: tienda.id, productoId: p.id, creadoEn: fecha(i % 5) }]),
    promos: [], solicitudes: [], avisos: [], ajustesInventario: productos.filter(p => !p.opciones.length).slice(0, 1).map(p => ({ id: "demo-publica-ajuste-1", tiendaId: tienda.id, productoId: p.id, varianteId: null, variacion: 2, stockAnterior: (p.stock ?? 2) - 2, stockNuevo: p.stock ?? 2, motivo: "reposicion", nota: "Compra ficticia de reposición", actorId: "demo-publica-dueno", creadoEn: fecha(1) })), jugadaEnvios: [], trabajosRetoque: [], marcasRetoque: {},
    equipos: { [tienda.id]: { miembros: [{ usuarioId: "demo-publica-dueno", nombre: "Tu tienda de ejemplo", email: "ejemplo@example.invalid", foto: null, rol: "dueno", nivel: "administrador", soyYo: true, desde: fecha(30) }], solicitudes: [], enlaces: [], invitaciones: [] } }, nivelDemo: "dueno",
  };
}
