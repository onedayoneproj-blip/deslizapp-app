import { ZONA_HORARIA } from "./config";

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

/** Enlace para abrir WhatsApp con un mensaje listo. `numero` sin "+" ni espacios; vacío = elegir contacto. */
export function enlaceWhatsApp(numero: string | null, texto: string): string {
  const limpio = (numero ?? "").replace(/\D/g, "");
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`;
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora de Santo Domingo. */
export function saludo(ahora: Date = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: ZONA_HORARIA }).format(ahora));
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" });
const hora = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, hour: "numeric", minute: "2-digit", hour12: true });
const diaSemana = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, weekday: "short" });
const diaMes = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, day: "numeric", month: "short" });

const DIA_MS = 24 * 60 * 60 * 1000;
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "6:12 p. m." (hora de Santo Domingo; los espacios finos de Intl pasan a espacios normales). */
const horaCorta = (fecha: Date) => hora.format(fecha).replace(/\s/g, " ").toLowerCase();

/** "Hoy, 6:12 p. m." · "Ayer, 6:12 p. m." · "Jue, 4:05 p. m." · "12 sep, 4:05 p. m." (más de una semana). */
export function fechaCorta(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const dias = Math.round((Date.parse(dia.format(ahora)) - Date.parse(dia.format(fecha))) / DIA_MS);
  let cuando: string;
  if (dias <= 0) cuando = "Hoy";
  else if (dias === 1) cuando = "Ayer";
  else if (dias < 7) cuando = mayuscula(diaSemana.format(fecha).replace(".", ""));
  else cuando = diaMes.format(fecha).replace(".", "");
  return `${cuando}, ${horaCorta(fecha)}`;
}

/** "Hoy" · "Ayer" · "Jue" · "12 sep": el día, sin la hora (la hora queda en el detalle). */
export function diaRelativo(iso: string, ahora: Date = new Date()): string {
  return fechaCorta(iso, ahora).split(",")[0]!;
}

/** "Hace un momento" · "Hace 8 min" · "Hace 3 h" y, pasado eso, el día sin la hora ("Ayer", "Jue", "12 sep"). */
export function haceCuantoSinHora(iso: string, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - Date.parse(iso)) / 60000);
  if (minutos < 60 * 12) return haceCuanto(iso, ahora);
  return diaRelativo(iso, ahora);
}

/** "Hace un momento" · "Hace 8 min" · "Hace 3 h" · y pasado el día, la fecha corta ("Ayer, 6:12 p. m."). */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - Date.parse(iso)) / 60000);
  if (minutos < 1) return "Hace un momento";
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 60 * 12) return `Hace ${Math.floor(minutos / 60)} h`;
  return fechaCorta(iso, ahora);
}

/** "25 sep → 2 oct" · "Desde el 25 sep" (sin fecha de fin). */
export function rangoFechas(inicio: string, fin: string | null): string {
  const d = (iso: string) => diaMes.format(new Date(iso)).replace(".", "");
  return fin ? `${d(inicio)} → ${d(fin)}` : `Desde el ${d(inicio)}`;
}

/** "3 oct" (día y mes cortos de Santo Domingo). */
export const diaMesCorto = (iso: string) => diaMes.format(new Date(iso)).replace(".", "");

const diaMesLargo = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, day: "numeric", month: "long" });

/** "3 de octubre" (para mensajes; día de Santo Domingo). */
export const fechaLarga = (iso: string) => diaMesLargo.format(new Date(iso));
