// Texto para búsquedas (clientes, productos, colecciones…): sin distinguir acentos ni mayúsculas.

export type Trozo = { texto: string; negrita: boolean };

/** "María" → "maria". Además devuelve, por cada letra del resultado, su posición en el texto original. */
function aplanar(texto: string): { plano: string; origen: number[] } {
  let plano = "";
  const origen: number[] = [];
  let i = 0;
  for (const caracter of texto) {
    const limpio = caracter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const c of limpio) {
      plano += c;
      origen.push(i);
    }
    i += caracter.length;
  }
  return { plano, origen };
}

export const sinAcentos = (texto: string) => aplanar(texto).plano;

/** Las palabras de lo escrito, sin acentos ni mayúsculas. */
export const palabras = (consulta: string) => sinAcentos(consulta).split(/\s+/).filter(Boolean);

/** ¿`texto` contiene TODAS las palabras? */
export const contieneTodas = (texto: string, lista: string[]) => {
  const plano = sinAcentos(texto);
  return lista.every((p) => plano.includes(p));
};

/** Parte `texto` en trozos marcando en negrita lo que coincide con la consulta (sin distinguir acentos). */
export function resaltar(texto: string, consulta: string): Trozo[] {
  const q = palabras(consulta);
  if (q.length === 0) return [{ texto, negrita: false }];
  const { plano, origen } = aplanar(texto);
  const marcado = new Array<boolean>(texto.length).fill(false);
  for (const palabra of q) {
    for (let desde = plano.indexOf(palabra); desde !== -1; desde = plano.indexOf(palabra, desde + palabra.length)) {
      const fin = origen[desde + palabra.length - 1]! + 1;
      for (let i = origen[desde]!; i < fin; i++) marcado[i] = true;
    }
  }
  return trozos(texto, marcado);
}

/** Junta letras seguidas con la misma marca en trozos. */
export function trozos(texto: string, marcado: boolean[]): Trozo[] {
  const salida: Trozo[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && ultimo.negrita === marcado[i]) ultimo.texto += texto[i];
    else salida.push({ texto: texto[i]!, negrita: marcado[i]! });
  }
  return salida;
}
