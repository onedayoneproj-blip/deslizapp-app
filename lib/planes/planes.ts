// Los planes de la página pública /planes (docs/prompts/pagina-planes.md). Puro: tests/planes.test.mjs.
// Nada de precios escritos aquí: todo sale de la tabla `planes` (se_ofrece = true).

/** Lo que la página necesita de cada plan. null en un límite = sin límite. */
export type PlanPublico = {
  id: string;
  nombre: string;
  precioMensual: number | null;
  precioAnual: number | null;
  limiteProductos: number | null;
  limiteTiendas: number | null;
  limitePersonas: number | null;
  destacado: boolean;
  idealPara: string;
};

/** Fila de `planes` tal como la devuelve Supabase. */
export type FilaPlanPublico = {
  id: string;
  nombre: string;
  precio_mensual: number | null;
  precio_anual: number | null;
  limite_productos: number | null;
  limite_tiendas: number | null;
  limite_personas: number | null;
  destacado: boolean;
  ideal_para: string | null;
};

export const COLUMNAS_PLAN_PUBLICO =
  "id,nombre,precio_mensual,precio_anual,limite_productos,limite_tiendas,limite_personas,destacado,ideal_para";

export function planDesdeFila(f: FilaPlanPublico): PlanPublico {
  return {
    id: f.id,
    nombre: f.nombre,
    precioMensual: f.precio_mensual,
    precioAnual: f.precio_anual,
    limiteProductos: f.limite_productos,
    limiteTiendas: f.limite_tiendas,
    limitePersonas: f.limite_personas,
    destacado: f.destacado,
    idealPara: f.ideal_para ?? "",
  };
}

/** Los días gratis con que empieza una tienda (/planes y el cierre de /conoce). */
export const DIAS_DE_PRUEBA = 30;

/** 1499 → "RD$1,499". */
export const pesos = (n: number): string => "RD$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Un plan solo se muestra si tiene precio mensual y anual. */
export const planesMostrables = (planes: PlanPublico[]): PlanPublico[] =>
  planes.filter((p) => p.precioMensual != null && p.precioAnual != null);

/** El precio grande de la tarjeta y su periodo, según el selector. */
export function precioDe(p: PlanPublico, anual: boolean): { precio: string; periodo: string; nota: string } {
  if (anual && p.precioAnual != null) {
    return { precio: pesos(p.precioAnual), periodo: "/año", nota: `Sale a ${pesos(p.precioAnual / 12)} al mes` };
  }
  return { precio: pesos(p.precioMensual ?? 0), periodo: "/mes", nota: "" };
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export type LimitePlan = { clave: "productos" | "tiendas" | "personas"; texto: string };

/** Los límites de la tarjeta, en el mismo orden para todos los planes (cada uno lleva su icono en la página). */
export function limitesDe(p: PlanPublico): LimitePlan[] {
  return [
    { clave: "productos", texto: p.limiteProductos == null ? "Productos publicados sin límite" : plural(p.limiteProductos, "producto publicado", "productos publicados") },
    { clave: "tiendas", texto: p.limiteTiendas == null ? "Todas las tiendas que quieras" : p.limiteTiendas === 1 ? "1 tienda" : `Hasta ${p.limiteTiendas} tiendas` },
    { clave: "personas", texto: p.limitePersonas == null ? "Equipo sin límite" : p.limitePersonas === 1 ? "1 persona" : `Hasta ${p.limitePersonas} personas en tu equipo` },
  ];
}

/** «Desde RD$499/mes · 30 días gratis»: el plan más barato que se ofrece. Sin planes, null (nunca un precio inventado). */
export function lineaDesde(planes: PlanPublico[]): string | null {
  const precios = planesMostrables(planes).map((p) => p.precioMensual!);
  if (!precios.length) return null;
  return `Desde ${pesos(Math.min(...precios))}/mes · ${DIAS_DE_PRUEBA} días gratis`;
}
