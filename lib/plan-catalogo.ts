// Espacio del plan: el límite de la tienda se mide contra los productos VISIBLES (activo = true).
// Los ocultos no cuentan. Puro, con pruebas en tests/plan-catalogo.test.mjs.

export type EstadoPlan = "sobra" | "quedan" | "casi" | "lleno";

export type ResumenPlan = {
  /** Productos visibles en el catálogo: lo que ocupa el plan. */
  usados: number;
  limite: number;
  /** Lugares que quedan (nunca negativo). */
  libres: number;
  /** Fracción usada, de 0 a 1 (0 si el límite es 0). */
  uso: number;
  estado: EstadoPlan;
};

type ConActivo = { activo: boolean };

/** Estado del plan según qué tanto se usó: < 70 % sobra, 70–89 % quedan, 90–99 % casi, 100 % lleno. */
export function estadoDelPlan(usados: number, limite: number): EstadoPlan {
  if (limite <= 0) return usados > 0 ? "lleno" : "sobra";
  if (usados >= limite) return "lleno";
  const uso = usados / limite;
  if (uso >= 0.9) return "casi";
  if (uso >= 0.7) return "quedan";
  return "sobra";
}

/** Cuenta del plan a partir de los productos: solo los visibles ocupan lugar. */
export function resumenDelPlan(productos: ConActivo[], limite: number): ResumenPlan {
  const usados = productos.filter((p) => p.activo).length;
  return {
    usados,
    limite,
    libres: Math.max(0, limite - usados),
    uso: limite > 0 ? Math.min(1, usados / limite) : 0,
    estado: estadoDelPlan(usados, limite),
  };
}

/** Título y subtítulo de la hoja "Tu inventario" según el estado del plan. */
export function textosDelPlan(r: Pick<ResumenPlan, "estado" | "libres">): { titulo: string; subtitulo: string } {
  const lugares = r.libres === 1 ? "Te queda 1 lugar" : `Te quedan ${r.libres} lugares`;
  switch (r.estado) {
    case "sobra":
      return { titulo: "Tienes espacio de sobra", subtitulo: "Sube lo que quieras, aquí cabe." };
    case "quedan":
      return { titulo: lugares, subtitulo: "Haz espacio con lo que ya no se mueve o sube de plan." };
    case "casi":
      return { titulo: "Ya casi no te cabe nada", subtitulo: `${lugares}. Libera los agotados o sube de plan.` };
    case "lleno":
      return { titulo: "Tu catálogo está lleno", subtitulo: "Para subir otro producto, haz espacio o sube de plan." };
  }
}
