// "Le escribiste hace 3 días": lo enviado desde las jugadas cambia el dato de la fila y el orden de la lista de cada jugada.
// Puro, con pruebas en tests/jugada-mensajes.test.mjs.

/** Días hacia atrás en los que un envío cuenta como reciente. */
export const DIAS_ENVIO_RECIENTE = 7;
const DIA = 86_400_000;
/** Día civil de Santo Domingo (UTC−4). */
const dia = (ms: number) => Math.floor((ms - 4 * 3_600_000) / DIA);

/** "Le escribiste hoy" · "ayer" · "hace 3 días", o null si no hay envío en los últimos 7 días. */
export function textoEnvioReciente(enviadoEn: string | null | undefined, ahora: number): string | null {
  if (!enviadoEn) return null;
  const dias = dia(ahora) - dia(Date.parse(enviadoEn));
  if (!Number.isFinite(dias) || dias < 0 || dias > DIAS_ENVIO_RECIENTE) return null;
  return dias === 0 ? "Le escribiste hoy" : dias === 1 ? "Le escribiste ayer" : `Le escribiste hace ${dias} días`;
}

/**
 * Ordena los clientes de una jugada: primero los que no tienen envío reciente (en su orden), al final los que sí. Devuelve también el
 * texto de cada uno con envío reciente. "Empieza con estos 5" toma los primeros de esta lista.
 */
export function ordenarPorEnvio<C extends { id: string }>(
  clientes: C[],
  envios: { clienteId: string; enviadoEn: string }[],
  ahora: number,
): { lista: C[]; recientes: Map<string, string> } {
  const ultimo = new Map<string, string>();
  for (const e of envios) {
    const previo = ultimo.get(e.clienteId);
    if (!previo || e.enviadoEn > previo) ultimo.set(e.clienteId, e.enviadoEn);
  }
  const recientes = new Map<string, string>();
  for (const c of clientes) {
    const t = textoEnvioReciente(ultimo.get(c.id), ahora);
    if (t) recientes.set(c.id, t);
  }
  return { lista: [...clientes.filter((c) => !recientes.has(c.id)), ...clientes.filter((c) => recientes.has(c.id))], recientes };
}
