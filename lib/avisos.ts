// "Avísame cuando llegue" en el panel (docs/12 §9; tablero Producto «Inventario»).
import { normalizarTelefonoDO } from "./telefono";
import type { AvisoLlegada, Cliente } from "./types";

/** Pendientes de una sola tienda. Las filas por variante se conservan; los contadores son personas. */
export function resumenEspera(avisos: AvisoLlegada[], tiendaId: string) {
  const porProducto = new Map<string, AvisoLlegada[]>();
  const personas = new Set<string>();
  const personasPorProducto = new Map<string, number>();
  const identidad = (a: AvisoLlegada) => normalizarTelefonoDO(a.telefono) ?? a.telefono.replace(/\D/g, "");
  for (const a of avisos) {
    if (a.tiendaId !== tiendaId || a.avisadoEn !== null) continue;
    personas.add(identidad(a));
    const filas = porProducto.get(a.productoId) ?? [];
    filas.push(a); porProducto.set(a.productoId, filas);
  }
  for (const [id, filas] of porProducto) personasPorProducto.set(id, new Set(filas.map(identidad)).size);
  return { porProducto, personasPorProducto, personas: personas.size, productos: porProducto.size };
}

export const textoEspera = (n: number) => n === 1 ? "1 persona espera" : `${n} personas esperan`;

/** Solo un catálogo HTTPS publicado; nunca enlaces inventados o ejecutables. */
export function catalogoParaAviso(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    u.hash = "";
    return u.href;
  } catch { return null; }
}

/** "¡Hola Carolina! Ya llegó Mayar · 50 ml. Aquí lo tienes antes de que se vaya: https://…#p/mayar". Sin nombre: "¡Hola! …". */
export function mensajeYaLlego(d: { nombre: string | null; producto: string; variante: string | null; urlCatalogo: string | null; slug: string }): string {
  const hola = d.nombre?.trim() ? `¡Hola ${d.nombre.trim().split(/\s+/)[0]}!` : "¡Hola!";
  const que = d.variante ? `${d.producto} · ${d.variante}` : d.producto;
  const url = catalogoParaAviso(d.urlCatalogo);
  const enlace = url ? ` Aquí lo tienes antes de que se vaya: ${url}#p/${d.slug}` : "";
  return `${hola} Ya llegó ${que}.${enlace}`;
}

/** "18095550142" → enlace de WhatsApp con el mensaje. */
export const enlaceAviso = (telefono: string, mensaje: string) => `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;

/** Chat de WhatsApp con ese número, sin mensaje escrito ("Escribir" libre, no el aviso de «Ya llegó»). */
export const enlaceChat = (telefono: string) => `https://wa.me/${telefono.replace(/\D/g, "")}`;

/** Clientes con teléfono, por teléfono normalizado: se arma UNA vez por lista y cada fila consulta el mapa. Si dos comparten número, queda el primero. */
export function clientesPorTelefono<C extends Pick<Cliente, "telefono">>(clientes: C[]): Map<string, C> {
  const mapa = new Map<string, C>();
  for (const c of clientes) {
    if (!c.telefono) continue;
    const clave = normalizarTelefonoDO(c.telefono) ?? c.telefono;
    if (!mapa.has(clave)) mapa.set(clave, c);
  }
  return mapa;
}

/** El cliente registrado con el teléfono de un aviso (en cualquier formato del mismo número), o null. */
export const clienteDelAviso = <C,>(mapa: Map<string, C>, telefono: string): C | null => mapa.get(normalizarTelefonoDO(telefono) ?? telefono) ?? null;

/** Cuántos esperan cada producto (por id). */
export function esperanPorProducto(avisos: { productoId: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of avisos) m.set(a.productoId, (m.get(a.productoId) ?? 0) + 1);
  return m;
}
