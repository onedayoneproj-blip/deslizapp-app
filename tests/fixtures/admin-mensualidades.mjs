// Datos ficticios compartidos por demo y PostgreSQL desechable.
export const relojes = [
  "2024-01-31T12:00:00Z",
  "2025-01-31T12:00:00Z",
  "2024-02-29T12:00:00Z",
  "2026-10-01T03:59:59Z",
  "2026-10-01T04:00:00Z",
];
const secuencias = [
  [1, -1],
  [1, 2, -1, -2],
  [1, 2, -2, -1],
  [1, 2, 3, -1],
  [1, 2, 3, -2],
  [1, 2, 3, -3],
  [1, 2, 3, -1, -2, -3],
  [1, 2, 3, -1, -3, -2],
  [1, 2, 3, -2, -1, -3],
  [1, 2, 3, -2, -3, -1],
  [1, 2, 3, -3, -1, -2],
  [1, 2, 3, -3, -2, -1],
  [1, 2, -1, 3, -2, -3],
];
export const casosMensualidad = relojes
  .flatMap((reloj) =>
    [null, "2023-01-01", "2027-01-31"].flatMap((previa) =>
      [
        [1, 1, 1],
        [2, 3, 12],
      ].flatMap((meses) =>
        secuencias.map((acciones) => ({ reloj, previa, meses, acciones })),
      ),
    ),
  )
  .concat([
    {
      reloj: relojes[0],
      previa: null,
      meses: [1, 2, 3],
      acciones: [1, 2, -1, 3, -2, -3],
      fechasPorPago: {
        1: relojes[0],
        2: "2024-03-31T12:00:00Z",
        3: "2024-09-30T03:00:00Z",
      },
      anulacionEn: "2028-01-01T12:00:00Z",
    },
    {
      reloj: relojes[1],
      previa: "2027-01-31",
      meses: [1, 1, 1],
      acciones: [1, 2, 3, -2, -1, -3],
      fechasPorPago: {
        1: relojes[1],
        2: "2025-02-28T04:00:00Z",
        3: "2025-03-31T12:00:00Z",
      },
      anulacionEn: "2030-01-01T12:00:00Z",
    },
  ]);

// Oráculo independiente de las funciones de la app: calendario civil ISO, con recorte del día.
export function sumarCalendario(fecha, meses) {
  const [a, m, d] = fecha.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(
    Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth() + 1, 0),
  ).getUTCDate();
  primero.setUTCDate(Math.min(d, ultimo));
  return primero.toISOString().slice(0, 10);
}
export const fechaRD = (reloj) =>
  new Date(Date.parse(reloj) - 4 * 3600000).toISOString().slice(0, 10);
export function esperado(caso, vigentes) {
  let fecha = caso.previa;
  for (const numero of [...vigentes].sort((a, b) => a - b)) {
    const dia = fechaRD(caso.fechasPorPago?.[numero] ?? caso.reloj);
    fecha = sumarCalendario(
      fecha && fecha > dia ? fecha : dia,
      caso.meses[numero - 1],
    );
  }
  return fecha;
}
