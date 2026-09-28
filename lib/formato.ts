const pesos = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 2500 → "RD$2,500" */
export function formatearPesos(monto: number): string {
  return `RD$${pesos.format(monto)}`;
}

/** "Carolina Peña" → "CP" */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join("");
}
