import { DatosInvalidos } from "./data/errores";
import type { Tienda, Producto } from "./types";
import type { EquipoTienda } from "./equipo";

export function productosParaChecklist(productos: readonly Producto[], tiendaId: string): number {
  return productos.filter(p => p.tiendaId === tiendaId && p.activo && !p.eliminadoEn && (p.fotos.some(Boolean) || p.medios.some(m => m.tipo === "foto" && !!m.url))).length;
}
export function pasosChecklist(tienda: Tienda, productos: readonly Producto[], equipo: EquipoTienda, instalada: boolean): boolean[] {
  const o = tienda.onboarding ?? {};
  return [!!tienda.logoUrl, !!o.colores_elegidos_en, productosParaChecklist(productos, tienda.id) >= 5, tienda.catalogoEstado === "publicado", !!tienda.descripcion?.trim(), instalada || !!o.pantalla_inicio_en, equipo.miembros.length > 1 || equipo.invitaciones.length > 0 || !!o.equipo_omitido_en];
}
export function puedeVerChecklist(tienda: Tienda | null, duena: boolean, soloMirar: boolean): boolean {
  return !!tienda && duena && !soloMirar && (tienda.estado === "activa" || tienda.estado === "en_prueba") && !tienda.onboarding?.checklist_cerrado_en;
}
export function perfilCatalogoValido(descripcion: string, instagram: string): { descripcion: string | null; instagram: string | null } {
  const d = descripcion.trim(); const ig = instagram.trim().replace(/^@/, "");
  if (d.length > 160) throw new DatosInvalidos("La descripción va hasta 160 letras.");
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) throw new DatosInvalidos("Escribe tu usuario de Instagram, sin enlaces ni espacios.");
  return { descripcion: d || null, instagram: ig || null };
}
