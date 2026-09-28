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
