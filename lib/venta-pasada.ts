// Fechas de "Es una venta que ya hice" (Nuevo pedido). Sin dependencias: se prueba en tests/venta-pasada.test.mjs.

const dos = (n: number) => String(n).padStart(2, "0");

/** "AAAA-MM-DD" de la fecha local del aparato (el valor y el máximo de <input type="date">). */
export const diaLocal = (ahora: Date = new Date()) => `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;

/**
 * La fecha (ISO) que se guarda para el día elegido: mediodía hora local, para que ninguna zona horaria lo cambie de día.
 * Si el día es hoy y todavía no es mediodía, se usa "ahora" (la base no acepta fechas futuras). null si el día no es
 * válido o es futuro.
 */
export function fechaDeVenta(dia: string, ahora: Date = new Date()): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const mediodia = new Date(a, mes - 1, d, 12, 0, 0, 0);
  // new Date corrige días que no existen (31 de febrero): se rechaza si no coincide.
  if (mediodia.getFullYear() !== a || mediodia.getMonth() !== mes - 1 || mediodia.getDate() !== d) return null;
  if (dia > diaLocal(ahora)) return null;
  return (mediodia.getTime() > ahora.getTime() ? ahora : mediodia).toISOString();
}

const formatoDia = new Intl.DateTimeFormat("es-DO", { timeZone: "UTC", day: "numeric", month: "long" });

/** "3 de octubre" del día elegido ("2026-10-03"), sin depender de la zona horaria. */
export const diaEnPalabras = (dia: string) => formatoDia.format(new Date(`${dia}T12:00:00Z`));

/**
 * ¿El editor ofrece «Es una venta que ya hice»? No en un pedido despachado ni en uno que se REABRIÓ desde despachado en esta misma
 * hoja: con «Descontar del stock» apagado volvería a marcarlo despachado sin restar el stock que reabrir devolvió. Para volver a
 * despachar se usa «Despachar pedido», que valida y descuenta el stock.
 */
export function ofreceVentaPasada(estado: string | undefined, veniaDespachado: boolean): boolean {
  return estado !== "despachado" && !veniaDespachado;
}

/**
 * El día que cuenta en la «firma» del editor (lo que decide si cerrar pregunta «¿Salir sin guardar?»): solo si la fecha se edita
 * (venta pasada, o un editor abierto con un despachado). Depende de `veniaDespachado`, que no cambia al reabrir, y no del estado
 * actual del pedido: así reabrir sin tocar nada no cambia la firma ni dispara el aviso.
 */
export function diaEnFirma(ventaPasada: boolean, veniaDespachado: boolean, dia: string): string | null {
  return ventaPasada || veniaDespachado ? dia : null;
}
