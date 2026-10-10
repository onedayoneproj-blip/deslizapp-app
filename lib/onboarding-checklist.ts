import { DatosInvalidos } from "./data/errores";
import type { Tienda, Producto } from "./types";
import type { EquipoTienda } from "./equipo";

// El capítulo 1 es la creación; sus cuatro pantallas son subpasos.
export const CAPITULOS_CHECKLIST = [
  { numero: 2, nombre: "Tu tienda tiene personalidad", pasos: [0, 1, 4] },
  { numero: 3, nombre: "Tus productos salen al mundo", pasos: [2, 3] },
  { numero: 4, nombre: "Tu tienda, a mano", pasos: [5, 6] },
] as const;

export function avanceCapitulos(pasos: readonly boolean[]) {
  return CAPITULOS_CHECKLIST.map(capitulo => {
    const hechos = capitulo.pasos.filter(i => pasos[i] === true).length;
    const total = capitulo.pasos.length;
    return { ...capitulo, hechos, total, estado: hechos === 0 ? "Sin iniciar" : hechos === total ? "Completo" : "En curso", completo: hechos === total };
  });
}

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
