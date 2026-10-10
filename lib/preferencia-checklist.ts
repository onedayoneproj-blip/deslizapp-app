// Preferencia visual del navegador: nunca escribe marcas compartidas de onboarding.
export type PreferenciaChecklist = { minimizada: boolean; capitulo?: number };
const memoria = new Map<string, PreferenciaChecklist>();
export const clavePreferenciaChecklist = (usuario: string, modo: string, tienda: string) =>
  `deslizapp-guia-v1:${encodeURIComponent(usuario)}:${encodeURIComponent(modo)}:${encodeURIComponent(tienda)}`;

export function leerPreferenciaChecklist(clave: string): PreferenciaChecklist {
  const previa = memoria.get(clave);
  if (previa) return previa;
  let valor: PreferenciaChecklist = { minimizada: false };
  try {
    const guardada = JSON.parse(localStorage.getItem(clave) ?? "null");
    if (guardada && typeof guardada.minimizada === "boolean") {
      valor = { minimizada: guardada.minimizada };
      if (Number.isInteger(guardada.capitulo) && guardada.capitulo >= 0 && guardada.capitulo < 3) valor.capitulo = guardada.capitulo;
    }
  } catch { /* Almacenamiento bloqueado o corrupto: sigue en memoria. */ }
  memoria.set(clave, valor);
  return valor;
}

export function guardarPreferenciaChecklist(clave: string, valor: PreferenciaChecklist) {
  memoria.set(clave, valor);
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* Sigue en memoria. */ }
}
