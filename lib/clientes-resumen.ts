import type { ClienteConResumen, Pedido } from "./types";

/** Los filtros de la lista de Clientes (las pastillas). */
export type FiltroClientes = "todos" | "deben" | "repiten" | "nuevos" | "dormidos";
/** Grupos que se cuentan en el resumen; los que no son filtro ("una", "sin", "catalogo", "manual") solo se muestran como dato. */
export type GrupoClientes = Exclude<FiltroClientes, "deben"> | "una" | "sin" | "catalogo" | "manual";
export type ClienteAnalizado = ClienteConResumen & { compras: number; primeraVenta: number | null; ultimaVenta: number | null; nuevo: boolean; dormido: boolean };
const DIA = 86400000;
/** Día civil de Santo Domingo (UTC−4), sin depender de la zona horaria del dispositivo. */
const dia = (ms: number) => Math.floor((ms - 4 * 3600000) / DIA);

/** Solo despachados; ignora pedidos y clientes de otras tiendas y fechas futuras/inválidas. */
export function analizarClientes(clientes: ClienteConResumen[], pedidos: Pedido[], tiendaId: string, ahora: number) {
  const ventas = new Map<string, { cantidad: number; total: number; primera: number; ultima: number }>();
  let totalVendido = 0;
  for (const p of pedidos) {
    if (p.tiendaId !== tiendaId || p.estado !== "despachado") continue;
    const fecha = Date.parse(p.despachadoEn ?? p.creadoEn);
    if (!Number.isFinite(fecha) || fecha > ahora) continue;
    totalVendido += p.total;
    if (!p.clienteId) continue;
    const v = ventas.get(p.clienteId);
    ventas.set(p.clienteId, { cantidad: (v?.cantidad ?? 0) + 1, total: (v?.total ?? 0) + p.total,
      primera: Math.min(v?.primera ?? fecha, fecha), ultima: Math.max(v?.ultima ?? fecha, fecha) });
  }
  const lista: ClienteAnalizado[] = clientes.filter((c) => c.tiendaId === tiendaId).map((c) => {
    const v = ventas.get(c.id);
    return { ...c, compras: v?.cantidad ?? 0, repite: (v?.cantidad ?? 0) >= 2, totalGastado: v?.total ?? 0,
      primeraVenta: v?.primera ?? null, ultimaVenta: v?.ultima ?? null,
      nuevo: Boolean(v && dia(ahora) - dia(v.primera) < 30),
      dormido: Boolean(v && dia(ahora) - dia(v.ultima) >= 60) };
  });
  const contar = (f: GrupoClientes) => lista.filter((c) => cumpleFiltroCliente(c, f)).length;
  const cuentas = { todos: lista.length, repiten: contar("repiten"), una: contar("una"), sin: contar("sin"),
    nuevos: contar("nuevos"), dormidos: contar("dormidos"), catalogo: contar("catalogo"), manual: contar("manual") };
  const ventaRepiten = lista.filter((c) => c.repite).reduce((s, c) => s + c.totalGastado, 0);
  return { lista, cuentas, totalVendido, porcentajeRepiten: totalVendido > 0 ? Math.round(100 * ventaRepiten / totalVendido) : 0 };
}
export type ResumenClientes = ReturnType<typeof analizarClientes>;
export function cumpleFiltroCliente(c: ClienteAnalizado, filtro: GrupoClientes | FiltroClientes) {
  switch (filtro) {
    case "repiten": return c.compras >= 2;
    case "una": return c.compras === 1;
    case "sin": return c.compras === 0;
    case "nuevos": return c.nuevo;
    case "dormidos": return c.dormido;
    case "catalogo": return c.origen === "catalogo";
    case "manual": return c.origen === "manual";
    default: return true;
  }
}
export function ordenarClientes(a: ClienteAnalizado, b: ClienteAnalizado, filtro: FiltroClientes) {
  const orden = filtro === "dormidos" ? (a.ultimaVenta ?? 0) - (b.ultimaVenta ?? 0)
    : filtro === "nuevos" ? (b.primeraVenta ?? 0) - (a.primeraVenta ?? 0)
    : filtro === "repiten" ? b.compras - a.compras : 0;
  return orden || a.nombre.localeCompare(b.nombre, "es");
}
export function mensajeDormido(nombre: string, vendedora: string, tienda: string, enlace: string | null) {
  let url = "";
  try { if (enlace && new URL(enlace).protocol === "https:") url = enlace; } catch { /* Enlace opcional. */ }
  return `¡Hola, ${nombre}! Te escribe ${vendedora.trim() || "el equipo"} de ${tienda}. Hace tiempo no te veo por aquí; tengo perfumes nuevos que te van a encantar${url ? `: ${url}` : "."}`;
}
