// Novedades de cada versión del panel, de la más nueva a la más vieja.
//
// REGLA (ver HANDOFF.md): cada cambio visible para el dueño de la tienda suma una línea aquí.
// Si el cambio va en una versión nueva, se agrega una entrada NUEVA ARRIBA con número mayor:
// al abrir la app después del despliegue, cada persona verá esa entrada una sola vez.
// Líneas cortas, en tono de marca (docs/01-marca.md), hablándole de "tú".

export type Novedad = {
  /** Versión "mayor.menor.parche" (ej. "0.2.0"). */
  version: string;
  /** Fecha de publicación, "AAAA-MM-DD". */
  fecha: string;
  /** Titular corto, con remate. */
  titulo: string;
  /** De 2 a 4 líneas cortas. */
  cambios: string[];
};

export const NOVEDADES: Novedad[] = [
  {
    version: "0.2.0",
    fecha: "2026-09-29",
    titulo: "Tu vitrina ya tiene luz.",
    cambios: [
      "Tu catálogo completo: busca, filtra y edita sin salir de la vitrina.",
      "Retoca fotos con un toque: luz, fondo y color por 5 créditos.",
      "Instálala en tu celular. Parece app porque ya es app.",
      "Cuando haya algo nuevo, te avisamos. Tú solo tocas Actualizar.",
    ],
  },
  {
    version: "0.1.0",
    fecha: "2026-09-28",
    titulo: "Llegó tu panel.",
    cambios: [
      "Tu tienda, tus pedidos y tus créditos en un solo lugar.",
      "Tu plan y tus créditos a la vista. Si se te queda chiquito, nos escribes.",
    ],
  },
];

export const VERSION_ACTUAL = NOVEDADES[0]!.version;

/** Compara "0.10.0" con "0.9.2" como números, no como texto. */
export function compararVersiones(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Las versiones posteriores a `vista` (la última que la persona ya vio), de la más nueva a la más vieja. */
export function novedadesDesde(vista: string): Novedad[] {
  return NOVEDADES.filter((n) => compararVersiones(n.version, vista) > 0);
}
