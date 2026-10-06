/** "hoy" · "ayer" · "hace 3 días" (días de calendario de Santo Domingo). */
export function haceDias(iso: string | null, ahora = Date.now()): string {
  if (!iso) return "hace un rato";
  const dia = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date(ms));
  const dias = Math.round((Date.parse(dia(ahora)) - Date.parse(dia(Date.parse(iso)))) / 86_400_000);
  return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
}
