import type { ProductoPublico, ItemSolicitud, CatalogoPublico } from "../types";
import type { LineaCarrito } from "../data/fuente";
import { fotoDeEleccion } from "./presentaciones.ts";
export type LineaLocal = LineaCarrito & {
  slug: string;
  nombre: string;
  varianteTexto: string | null;
  foto: string | null;
  precioUnitario: number;
  porEncargo: boolean;
  noDisponible?: boolean;
};
export const dinero = (n: number) =>
  "RD$" + Math.round(n).toLocaleString("es-DO");
export function mensajePedido(
  t: CatalogoPublico["tienda"],
  items: Pick<
    ItemSolicitud,
    "nombre" | "varianteTexto" | "cantidad" | "precioUnitario" | "porEncargo"
  >[],
  total: number,
  link?: { codigo: string; origen: string },
): string {
  const m = t.personalizacion.mensajes as Record<string, string> | undefined;
  const lineas = items
    .map(
      (p) =>
        `• ${p.nombre}${p.varianteTexto ? " · " + p.varianteTexto : ""}${p.cantidad > 1 ? " × " + p.cantidad : ""} (${dinero(p.precioUnitario * p.cantidad)})${p.porEncargo ? " · Por encargo" : ""}`,
    )
    .join("\n");
  return `${m?.saludo_whatsapp ?? `¡Hola ${t.nombreVendedora ?? t.nombre}! Vi tu catálogo y quiero:`}\n${lineas}\n\nTotal: ${dinero(total)}\n${m?.cierre_whatsapp ?? "¿Los tienes disponibles?"}${link ? `\n\nMi pedido #${link.codigo}:\n${link.origen}/pedido/${link.codigo}` : ""}`;
}
export function lineaDe(
  p: ProductoPublico,
  varianteId: string | null,
): LineaLocal {
  const v = p.variantes.find((v) => v.id === varianteId);
  return {
    productoId: p.id,
    varianteId: v?.id ?? null,
    cantidad: 1,
    slug: p.slug,
    nombre: p.nombre,
    varianteTexto: v
      ? p.opciones
          .map(
            (o) =>
              (o.nombre.toLowerCase() === "color" ? "" : o.nombre + " ") +
              v.valores[o.nombre],
          )
          .join(" · ")
      : null,
    // La foto del color elegido, si el producto tiene una asignada; si no, la primera foto.
    foto: (v && fotoDeEleccion(p, v.valores)) || (p.medios.find((m) => m.tipo === "foto")?.url ?? null),
    precioUnitario: v
      ? (v.precioPromo ?? v.precio)
      : (p.precioPromo ?? p.precio),
    porEncargo: (v?.disponibilidad ?? p.disponibilidad) === "por_encargo",
  };
}
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
export function guardarLocal(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* Privado/sin espacio: el pedido sigue disponible en memoria. */
  }
}
export function leerCarrito(
  slug: string,
  productos: ProductoPublico[],
): LineaLocal[] {
  const key = "dz-carrito-" + slug;
  let raw = leer(key);
  if (raw === null && slug === "esencias-michel") {
    try {
      const viejo = JSON.parse(leer("michel-cart") ?? "{}");
      raw = JSON.stringify(
        productos
          .filter((p) => viejo[p.slug])
          .map((p) => lineaDe(p, p.variantes[0]?.id ?? null)),
      );
      guardarLocal(key, raw);
    } catch {}
  }
  try {
    const a: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(a)) return [];
    return a
      .filter(
        (l): l is LineaLocal =>
          !!l &&
          typeof l === "object" &&
          typeof l.productoId === "string" &&
          Number.isInteger(l.cantidad) &&
          l.cantidad > 0 &&
          l.cantidad <= 20,
      )
      .flatMap((l) => {
        const p = productos.find((p) => p.id === l.productoId);
        const v = p?.variantes.find((v) => v.id === l.varianteId);
        return p && (!p.variantes.length || v)
          ? [
              {
                ...lineaDe(p, v?.id ?? null),
                cantidad: l.cantidad,
                noDisponible:
                  (v?.disponibilidad ?? p.disponibilidad) === "agotado",
              },
            ]
          : [];
      });
  } catch {
    return [];
  }
}
let dispositivoMemoria: string | null = null;
export function dispositivo(): string {
  let id = leer("dz-dispositivo");
  if (!id) {
    id = dispositivoMemoria ?? crypto.randomUUID();
    dispositivoMemoria = id;
    guardarLocal("dz-dispositivo", id);
  }
  return id;
}
export function vioCoach(slug: string): boolean {
  const key = "dz-coach-" + slug;
  if (leer(key)) return true;
  if (slug === "esencias-michel" && leer("michel-coach")) {
    guardarLocal(key, "1");
    return true;
  }
  return false;
}
