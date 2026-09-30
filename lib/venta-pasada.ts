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
