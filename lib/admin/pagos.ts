import type { PagoAdmin } from "./tipos";
import { diaRD, sumarMeses } from "./reglas";

/** Cobertura previa al primer pago + mensualidades vigentes, por numero original.
 * No utiliza cubreHasta histórico: conserva el comprobante original aunque cambie el cálculo.
 */
export function recalcularMensualidades(
  pagos: readonly PagoAdmin[],
  tiendaId: string,
  excluirId?: string,
): string | null {
  const originales = pagos
    .filter(
      (p) =>
        p.tiendaId === tiendaId &&
        p.concepto === "mensualidad" &&
        p.anulaA === null,
    )
    .sort((a, b) => a.numero - b.numero);
  let hasta = originales[0]?.pagadoHastaAnterior ?? null;
  const anulados = new Set(
    pagos
      .filter((p) => p.tiendaId === tiendaId && p.anulaA)
      .map((p) => p.anulaA),
  );
  for (const p of originales) {
    if (p.id === excluirId || anulados.has(p.id)) continue;
    const dia = diaRD(Date.parse(p.creadoEn));
    hasta = sumarMeses(hasta && hasta > dia ? hasta : dia, p.meses!);
  }
  return hasta;
}
