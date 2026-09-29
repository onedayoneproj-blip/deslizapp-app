// Búsqueda de clientes: UNA sola lógica para el buscador de Clientes y el selector de "+ Pedido".
// Encuentra por nombre, por teléfono y por nota; sin distinguir acentos ni mayúsculas.

import type { ClienteConResumen } from "./types";

export type DondeCoincide = "nombre" | "telefono" | "nota";

export type ResultadoCliente = {
  cliente: ClienteConResumen;
  /** Por qué salió: primero se mira el nombre, luego el teléfono y al final la nota. */
  coincide: DondeCoincide;
};

/** "María" → "maria". Además devuelve, por cada letra del resultado, su posición en el texto original. */
function aplanar(texto: string): { plano: string; origen: number[] } {
  let plano = "";
  const origen: number[] = [];
  let i = 0;
  for (const caracter of texto) {
    const limpio = caracter.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (const c of limpio) {
      plano += c;
      origen.push(i);
    }
    i += caracter.length;
  }
  return { plano, origen };
}

export const sinAcentos = (texto: string) => aplanar(texto).plano;

const palabras = (consulta: string) => sinAcentos(consulta).split(/\s+/).filter(Boolean);
const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

/**
 * Dígitos a buscar en un teléfono. Ignora espacios, guiones, paréntesis y el prefijo 1 / +1:
 * "(809) 555-1234", "809-555-1234" y "+1 809 555 1234" buscan lo mismo. Como ningún número
 * dominicano empieza con 1 (son 809, 829 y 849), un 1 al inicio se prueba también sin él.
 * Con menos de 3 dígitos no se busca por teléfono (todo coincidiría).
 */
export function digitosDeBusqueda(consulta: string): string[] {
  const d = soloDigitos(consulta);
  if (d.length < 3) return [];
  return d.startsWith("1") && d.length > 3 ? [d, d.slice(1)] : [d];
}

/** El teléfono guardado ("+18095551234") sin el prefijo de país: "8095551234". */
const nacional = (telefono: string) => {
  const d = soloDigitos(telefono);
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};

const contieneTodas = (texto: string, lista: string[]) => {
  const plano = sinAcentos(texto);
  return lista.every((p) => plano.includes(p));
};

/** ¿La consulta parece un teléfono (solo dígitos y separadores, 7 o más dígitos)? Para "Crear cliente «…»". */
export function pareceTelefono(consulta: string): boolean {
  return /^[\d\s+\-().]+$/.test(consulta.trim()) && soloDigitos(consulta).length >= 7;
}

/**
 * Clientes que coinciden con lo escrito. Con la consulta vacía devuelve todos (`coincide: "nombre"`).
 * Orden: coincidencias por nombre primero (las que empiezan con lo escrito, antes), luego teléfono, luego nota.
 */
export function buscarClientes(clientes: ClienteConResumen[], consulta: string): ResultadoCliente[] {
  const q = palabras(consulta);
  if (q.length === 0) return clientes.map((cliente) => ({ cliente, coincide: "nombre" }));
  const digitos = digitosDeBusqueda(consulta);
  const resultados: (ResultadoCliente & { rango: number })[] = [];
  for (const cliente of clientes) {
    if (contieneTodas(cliente.nombre, q)) {
      resultados.push({ cliente, coincide: "nombre", rango: sinAcentos(cliente.nombre).startsWith(q[0]!) ? 0 : 1 });
    } else if (cliente.telefono && digitos.some((d) => nacional(cliente.telefono!).includes(d))) {
      resultados.push({ cliente, coincide: "telefono", rango: 2 });
    } else if (cliente.nota && contieneTodas(cliente.nota, q)) {
      resultados.push({ cliente, coincide: "nota", rango: 3 });
    }
  }
  return resultados.sort((a, b) => a.rango - b.rango || a.cliente.nombre.localeCompare(b.cliente.nombre, "es"));
}

/** Los clientes con pedidos más recientes primero (los que aún no piden, al final, del más nuevo al más viejo). */
export function recientes(clientes: ClienteConResumen[], max = 8): ClienteConResumen[] {
  return [...clientes]
    .sort((a, b) => (b.ultimaCompra ?? "").localeCompare(a.ultimaCompra ?? "") || b.primerPedidoEn.localeCompare(a.primerPedidoEn))
    .slice(0, max);
}

export type Trozo = { texto: string; negrita: boolean };

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

/** Resalta en un teléfono ya formateado ("809-555-1234") los dígitos que coinciden con la consulta. */
export function resaltarTelefono(formateado: string, consulta: string): Trozo[] {
  const posiciones: number[] = []; // posición de cada dígito en el texto formateado
  [...formateado].forEach((c, i) => /\d/.test(c) && posiciones.push(i));
  const dig = posiciones.map((i) => formateado[i]).join("");
  const marcado = new Array<boolean>(formateado.length).fill(false);
  for (const d of digitosDeBusqueda(consulta)) {
    const desde = dig.indexOf(d);
    if (desde === -1) continue;
    // Incluye los separadores entre el primer y el último dígito marcado
    for (let i = posiciones[desde]!; i <= posiciones[desde + d.length - 1]!; i++) marcado[i] = true;
    break;
  }
  return trozos(formateado, marcado);
}

function trozos(texto: string, marcado: boolean[]): Trozo[] {
  const salida: Trozo[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && ultimo.negrita === marcado[i]) ultimo.texto += texto[i];
    else salida.push({ texto: texto[i]!, negrita: marcado[i]! });
  }
  return salida;
}
